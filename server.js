/**
 * USMS Mobile Pro v5 — Coolify ready
 * Persistent encrypted room chat + WebRTC signaling + TURN config
 * Messages are stored encrypted; server never receives plaintext message bodies.
 */

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, 'public'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const ROOM_LIMIT = Number(process.env.ROOM_LIMIT || 50);
const MAX_HISTORY_MESSAGES = Number(process.env.MAX_HISTORY_MESSAGES || 1200);
const MAX_PAYLOAD_BYTES = Number(process.env.MAX_PAYLOAD_BYTES || 26 * 1024 * 1024);
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS || 30000);
const SAVE_DEBOUNCE_MS = Number(process.env.SAVE_DEBOUNCE_MS || 600);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webm': 'video/webm'
};

const rooms = new Map();
const pendingSaves = new Map();
const sessions = new Map();

const USERS_FILE = path.join(DATA_DIR, 'users.json');
async function readUsers() {
  try { return JSON.parse(await fsp.readFile(USERS_FILE, 'utf8')); }
  catch { return { users: {} }; }
}
async function writeUsers(data) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 0), 'utf8');
  await fsp.rename(tmp, USERS_FILE);
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password || ''), salt, 210000, 32, 'sha256').toString('hex');
  return { salt, hash };
}
function verifyPassword(password, saved) {
  if (!saved || !saved.salt || !saved.hash) return false;
  const h = hashPassword(password, saved.salt).hash;
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(saved.hash, 'hex'));
}
function cleanUsername(value) {
  return cleanString(value, '', 32).toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '');
}
async function readJsonBody(req, max = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > max) { reject(new Error('Payload too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function sendJson(res, status, object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(object));
}

function splitEnv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function getIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ];
  const turnUrls = splitEnv(process.env.TURN_URLS);
  const username = process.env.TURN_USERNAME || '';
  const credential = process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || '';
  if (turnUrls.length && username && credential) servers.push({ urls: turnUrls, username, credential });
  return servers;
}

function cleanString(value, fallback = '', maxLength = 160) {
  return String(value ?? fallback).trim().slice(0, maxLength);
}

function safeName(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 48);
}

function roomFile(roomId, pwTag) {
  return path.join(DATA_DIR, 'rooms', `${safeName(`${roomId}|${pwTag}`)}.json`);
}

function publicProfile(profile = {}) {
  return {
    profileId: cleanString(profile.profileId, '', 80),
    name: cleanString(profile.name, 'Kullanıcı', 60),
    username: cleanString(profile.username, '', 32).toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, ''),
    avatar: typeof profile.avatar === 'string' && profile.avatar.length <= 260000 ? profile.avatar : '',
    email: cleanString(profile.email, '', 120),
    phone: cleanString(profile.phone, '', 40),
    bio: cleanString(profile.bio, '', 200),
    status: cleanString(profile.status, 'çevrimiçi', 80),
    color: cleanString(profile.color, '#19d3a2', 20),
    updatedAt: Date.now()
  };
}


function publicRoomMeta(meta = {}, fallbackTitle = '') {
  return {
    title: cleanString(meta.title, fallbackTitle, 80),
    description: cleanString(meta.description, '', 180),
    avatar: typeof meta.avatar === 'string' && meta.avatar.length <= 260000 ? meta.avatar : '',
    updatedAt: Date.now()
  };
}

function makeRoom(roomId, pwTag) {
  return {
    roomId,
    pwTag,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta: publicRoomMeta({}, roomId),
    peers: new Map(),
    profiles: {},
    messages: [],
    statuses: []
  };
}

async function loadRoom(roomId, pwTag) {
  const key = `${roomId}|${pwTag}`;
  if (rooms.has(key)) return rooms.get(key);
  const room = makeRoom(roomId, pwTag);
  try {
    const file = roomFile(roomId, pwTag);
    const raw = await fsp.readFile(file, 'utf8');
    const stored = JSON.parse(raw);
    room.createdAt = stored.createdAt || room.createdAt;
    room.updatedAt = stored.updatedAt || room.updatedAt;
    room.meta = publicRoomMeta(stored.meta || {}, roomId);
    room.profiles = stored.profiles || {};
    room.messages = Array.isArray(stored.messages) ? stored.messages.slice(-MAX_HISTORY_MESSAGES) : [];
    room.statuses = Array.isArray(stored.statuses) ? stored.statuses.slice(-100) : [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[room-load]', err.message);
  }
  rooms.set(key, room);
  return room;
}

async function persistRoom(room) {
  await fsp.mkdir(path.join(DATA_DIR, 'rooms'), { recursive: true });
  const file = roomFile(room.roomId, room.pwTag);
  const tmp = `${file}.tmp`;
  const data = {
    version: 5,
    roomId: room.roomId,
    pwTag: room.pwTag,
    createdAt: room.createdAt,
    updatedAt: Date.now(),
    meta: room.meta || publicRoomMeta({}, room.roomId),
    profiles: room.profiles,
    messages: room.messages.slice(-MAX_HISTORY_MESSAGES),
    statuses: room.statuses.slice(-100)
  };
  await fsp.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fsp.rename(tmp, file);
}

function scheduleSave(room) {
  const key = `${room.roomId}|${room.pwTag}`;
  clearTimeout(pendingSaves.get(key));
  pendingSaves.set(key, setTimeout(() => {
    persistRoom(room).catch((err) => console.error('[room-save]', err.message));
    pendingSaves.delete(key);
  }, SAVE_DEBOUNCE_MS));
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), payment=(), camera=(self), microphone=(self)');
  res.setHeader('Cache-Control', 'no-store');
}

function isInsidePublic(filePath) {
  const relative = path.relative(PUBLIC_DIR, filePath);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function getRoster(room) {
  return [...room.peers.values()].map((peer) => ({
    peerId: peer.peerId,
    profileId: peer.profile.profileId,
    name: peer.profile.name,
    avatar: peer.profile.avatar,
    email: peer.profile.email,
    phone: peer.profile.phone,
    bio: peer.profile.bio,
    status: peer.profile.status,
    color: peer.profile.color,
    joinedAt: peer.joinedAt
  }));
}

function broadcast(room, type, payload = {}, exceptPeerId = null) {
  for (const peer of room.peers.values()) {
    if (peer.peerId === exceptPeerId) continue;
    send(peer.ws, type, payload);
  }
}

function leave(ws) {
  if (!ws.roomKey) return;
  const room = rooms.get(ws.roomKey);
  if (!room) return;
  room.peers.delete(ws.peerId);
  broadcast(room, 'peer-left', { peerId: ws.peerId, profileId: ws.profileId, roster: getRoster(room) });
  ws.roomKey = null;
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  let url;
  try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Bad request'); }

  if (url.pathname === '/api/register' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const username = cleanUsername(body.username);
      const password = String(body.password || '');
      if (!username || password.length < 4) return sendJson(res, 400, { message: 'Kullanıcı adı ve en az 4 karakter şifre gerekli.' });
      const data = await readUsers();
      if (data.users[username]) return sendJson(res, 409, { message: 'Bu kullanıcı adı zaten var.' });
      const pass = hashPassword(password);
      const profile = publicProfile({ ...(body.profile || {}), username, name: body.profile?.name || username });
      data.users[username] = { username, pass, profile, createdAt: Date.now(), devices: [{ ip: req.socket.remoteAddress || '', ua: req.headers['user-agent'] || '', ts: Date.now() }] };
      await writeUsers(data);
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, username);
      return sendJson(res, 200, { ok: true, token, profile });
    } catch (err) { return sendJson(res, 400, { message: err.message || 'Kayıt yapılamadı.' }); }
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const username = cleanUsername(body.username);
      const data = await readUsers();
      const user = data.users[username];
      if (!user || !verifyPassword(body.password, user.pass)) return sendJson(res, 401, { message: 'Kullanıcı adı veya şifre yanlış.' });
      user.devices = Array.isArray(user.devices) ? user.devices.slice(-12) : [];
      user.devices.push({ ip: req.socket.remoteAddress || '', ua: req.headers['user-agent'] || '', ts: Date.now() });
      await writeUsers(data);
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, username);
      return sendJson(res, 200, { ok: true, token, profile: user.profile, devices: user.devices });
    } catch (err) { return sendJson(res, 400, { message: err.message || 'Giriş yapılamadı.' }); }
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()), version: '8.0.0' }));
  }

  if (url.pathname === '/config') {
    const iceServers = getIceServers();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      appName: process.env.APP_NAME || 'USMS Mobile Pro v6',
      iceServers,
      turnReady: iceServers.some((s) => JSON.stringify(s.urls || '').includes('turn:')),
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxPayloadBytes: MAX_PAYLOAD_BYTES,
      jitsiDomain: process.env.JITSI_DOMAIN || 'meet.hawarserver.com',
      groupCallEnabled: true,
      features: {
        persistentEncryptedHistory: true,
        profileCards: true,
        voiceMessages: true,
        videoMessages: true,
        cameraCapture: true,
        hdCalls: true,
        customizableTheme: true,
        pwa: true,
        groupCalls: true
      }
    }));
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!isInsidePublic(filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      return fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] }); return res.end(indexData);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

wss.on('connection', (ws, req) => {
  ws.peerId = crypto.randomUUID();
  ws.roomKey = null;
  ws.profileId = null;
  ws.isAlive = true;
  ws.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  send(ws, 'hello', { peerId: ws.peerId, ts: Date.now(), version: '8.0.0' });
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (raw) => {
    if (raw.length > MAX_PAYLOAD_BYTES) return send(ws, 'error', { message: 'Mesaj veya dosya çok büyük.' });
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return send(ws, 'error', { message: 'Geçersiz mesaj.' }); }

    try {
      switch (msg.type) {
        case 'join': {
          const roomId = cleanString(msg.room, '', 96);
          const pwTag = cleanString(msg.pwTag, '', 128);
          const profile = publicProfile(msg.profile || {});
          if (!roomId || !pwTag || !profile.profileId) return send(ws, 'error', { message: 'Oda, parola ve profil bilgisi gerekli.' });
          if (ws.roomKey && ws.roomKey !== `${roomId}|${pwTag}`) leave(ws);
          const room = await loadRoom(roomId, pwTag);
          if (!room.peers.has(ws.peerId) && room.peers.size >= ROOM_LIMIT) return send(ws, 'error', { message: 'Oda dolu.' });
          ws.roomKey = `${roomId}|${pwTag}`;
          ws.profileId = profile.profileId;
          room.profiles[profile.profileId] = { ...(room.profiles[profile.profileId] || {}), ...profile, updatedAt: Date.now() };
          room.peers.set(ws.peerId, { ws, peerId: ws.peerId, profile, joinedAt: Date.now() });
          scheduleSave(room);
          send(ws, 'joined', { peerId: ws.peerId, room: roomId, roomMeta: room.meta || publicRoomMeta({}, roomId), roster: getRoster(room), profiles: room.profiles, history: room.messages, statuses: room.statuses });
          broadcast(room, 'peer-joined', { peerId: ws.peerId, profile, roster: getRoster(room) }, ws.peerId);
          return;
        }

        case 'profile-update': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          const profile = publicProfile(msg.profile || {});
          ws.profileId = profile.profileId || ws.profileId;
          const peer = room.peers.get(ws.peerId);
          if (peer) peer.profile = { ...peer.profile, ...profile };
          if (profile.profileId) room.profiles[profile.profileId] = { ...(room.profiles[profile.profileId] || {}), ...profile, updatedAt: Date.now() };
          scheduleSave(room);
          broadcast(room, 'profile-update', { peerId: ws.peerId, profile, roster: getRoster(room) });
          return;
        }


        case 'room-meta-update': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          room.meta = publicRoomMeta(msg.roomMeta || {}, room.roomId);
          room.updatedAt = Date.now();
          scheduleSave(room);
          broadcast(room, 'room-meta-update', { roomMeta: room.meta });
          return;
        }


        case 'room-message': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          const peer = room.peers.get(ws.peerId);
          const item = {
            id: cleanString(msg.id, crypto.randomUUID(), 80),
            fromPeerId: ws.peerId,
            fromProfileId: ws.profileId || (peer && peer.profile.profileId) || '',
            senderName: peer ? peer.profile.name : 'Kullanıcı',
            senderAvatar: peer ? peer.profile.avatar : '',
            senderColor: peer ? peer.profile.color : '',
            ts: Number(msg.ts || Date.now()),
            kind: cleanString(msg.kind, 'text', 30),
            cipher: msg.cipher
          };
          if (!item.cipher || typeof item.cipher !== 'object') return send(ws, 'error', { message: 'Şifreli içerik eksik.' });
          if (!msg.ephemeral) {
            room.messages.push(item);
            room.messages = room.messages.slice(-MAX_HISTORY_MESSAGES);
            room.updatedAt = Date.now();
            scheduleSave(room);
          }
          broadcast(room, 'room-message', { message: item });
          return;
        }

        case 'status-post': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          const peer = room.peers.get(ws.peerId);
          const item = { id: cleanString(msg.id, crypto.randomUUID(), 80), fromPeerId: ws.peerId, fromProfileId: ws.profileId || '', senderName: peer ? peer.profile.name : 'Kullanıcı', ts: Date.now(), cipher: msg.cipher };
          room.statuses.push(item); room.statuses = room.statuses.slice(-100); scheduleSave(room);
          broadcast(room, 'status-post', { status: item });
          return;
        }

        case 'typing': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          const peer = room.peers.get(ws.peerId);
          broadcast(room, 'typing', { peerId: ws.peerId, name: peer ? peer.profile.name : 'Kullanıcı', active: Boolean(msg.active) }, ws.peerId);
          return;
        }

        case 'signal': {
          if (!ws.roomKey) return;
          const room = rooms.get(ws.roomKey); if (!room) return;
          const to = cleanString(msg.to, '', 80);
          const target = room.peers.get(to);
          const peer = room.peers.get(ws.peerId);
          const payload = { from: ws.peerId, fromProfile: peer ? peer.profile : {}, signal: msg.signal };
          if (target) send(target.ws, 'signal', payload);
          return;
        }

        default:
          send(ws, 'error', { message: 'Bilinmeyen işlem.' });
      }
    } catch (err) {
      console.error('[ws-message]', err);
      send(ws, 'error', { message: 'Sunucu işlem hatası.' });
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { leave(ws); ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, HEARTBEAT_MS);

process.on('SIGTERM', async () => {
  for (const room of rooms.values()) await persistRoom(room).catch(() => {});
  process.exit(0);
});

fsp.mkdir(path.join(DATA_DIR, 'rooms'), { recursive: true })
  .then(() => server.listen(PORT, '0.0.0.0', () => console.log(`USMS Mobile Pro v6 running on :${PORT}`)))
  .catch((err) => { console.error(err); process.exit(1); });
