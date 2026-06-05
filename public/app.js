(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const els = {};
  for (const id of [
    'loginView','appView','loginForm','joinBtn','serverStatus','nameInput','emailInput','phoneInput','bioInput','roomInput','passwordInput','avatarInput','avatarPickBtn','avatarPreview','avatarPreviewText',
    'myAvatar','myAvatarImg','myName','wsStatus','roomTitle','roomSubtitle','roomTime','chatRoomName','chatSub','roomAvatar','messages','typingLine','peerList','statusList','searchInput',
    'copyInviteBtn','securityBtn','securityModal','securityNumber','closeSecurityBtn','messageInput','sendBtn','emojiBtn','emojiPanel','attachBtn','fileInput','cameraShotBtn','cameraInput','voiceBtn','videoNoteBtn',
    'audioCallBtn','videoCallBtn','groupCallBtn','incomingModal','incomingAvatar','incomingTitle','incomingText','acceptCallBtn','rejectCallBtn','callView','remoteVideo','remoteAudio','localVideo','callName','callState','qualitySelect','videoEffectSelect','muteBtn','cameraBtn','switchCamBtn','fitBtn','snapshotBtn','callInviteBtn','endCallBtn',
    'infoPanel','roomInfoBtn','closeInfoBtn','selectedAvatar','selectedName','selectedBio','selectedEmail','selectedPhone','selectedStatus','peerNoteInput','savePeerNoteBtn','startPrivateChatBtn','openProfileBtn','profileModal','closeProfileBtn','profileAvatarBtn','profileAvatarText','profileAvatarImg','profileNameInput','profileEmailInput','profilePhoneInput','profileBioInput','saveProfileBtn',
    'openSettingsBtn','settingsModal','closeSettingsBtn','themeSelect','wallpaperSelect','bubbleSelect','fontSelect','soundSelect','defaultQualitySelect','selfViewMirrorSelect','jitsiInfoInput','enterSendSelect','rememberAccountSelect','settingsSecurityBtn','testSoundBtn','notificationPermissionBtn','saveSettingsBtn','newStatusBtn','statusModal','closeStatusBtn','statusInput','sendStatusBtn','usernameInput','profileUsernameInput','mainMenuModal','openMainMenuBtn','closeMainMenuBtn','shareInviteBtn','openRoomSettingsBtn','roomSettingsModal','closeRoomSettingsBtn','roomAvatarBtn','roomAvatarInput','roomAvatarText','roomAvatarPreview','roomDisplayNameInput','roomDescriptionInput','saveRoomSettingsBtn','contactsModal','openContactsBtn','contactsTabBtn','openContactsFromMenuBtn','openGroupCallFromMenuBtn','closeContactsBtn','contactUsernameInput','addContactBtn','contactsList','chatRoomAvatar','callBackBtn','messageActionModal','closeMessageActionBtn','replyMessageBtn','copyMessageBtn','editMessageBtn','deleteMessageBtn','pinMessageBtn','reactMessageBtn','replyPreview','replyPreviewText','cancelReplyBtn','mediaGalleryModal','openMediaGalleryBtn','closeMediaGalleryBtn','mediaGalleryList','accountModal','openAccountBtn','closeAccountBtn','accountUsernameInput','accountPasswordInput','accountNameInput','accountRegisterBtn','accountLoginBtn','accountState','secretModeToggle','expireSelect','groupCallView','groupCallBackBtn','groupCallTitle','groupCallInviteBtn','groupCallOpenExternalBtn','groupCallLeaveBtn','jitsiContainer','groupCallLoading','toastArea'
  ]) els[id] = $(id);

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const STORE_PROFILE = 'usms.v5.profile';
  const STORE_SETTINGS = 'usms.v5.settings';
  const STORE_NOTES = 'usms.v5.peerNotes';
  const STORE_CONTACTS = 'usms.v5.contacts';
  const DEFAULT_AVATAR_LIMIT = 240000;
  const EMOJIS = '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😍 🥰 😘 😎 🤝 👍 👏 🙏 💪 🔥 ✨ ❤️ 💙 💚 💎 🚀 ✅ 🔐 📌 📷 🎙️ 🎬 📁 🧾'.split(' ');

  const state = {
    ws: null,
    config: { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }], maxUploadBytes: 10 * 1024 * 1024, turnReady: false },
    profile: loadJson(STORE_PROFILE, null) || { profileId: crypto.randomUUID(), name: '', username: '', email: '', phone: '', bio: '', avatar: '', color: '#2aabee', status: 'çevrimiçi' },
    settings: loadJson(STORE_SETTINGS, null) || { theme: 'aurora', wallpaper: 'pro-midnight', bubble: 'modern', font: 'normal', sound: 'prism', quality: 'hd', secretMode: false, expire: 'never', selfMirror: false, enterSend: true, rememberAccount: true },
    peerNotes: loadJson(STORE_NOTES, {}) || {},
    contacts: loadJson(STORE_CONTACTS, {}) || {},
    invite: { autoJoin: false, call: false, groupCall: false },
    roomMeta: { title: '', description: '', avatar: '' },
    me: { peerId: null, room: '', password: '', pwTag: '', roomKey: null },
    connected: false,
    joined: false,
    peers: new Map(),
    profiles: {},
    selectedPeerId: null,
    selectedProfileId: null,
    messagesSeen: new Set(),
    messageRows: new Map(),
    messagePayloads: new Map(),
    selectedMessageId: null,
    replyTo: null,
    pinnedMessages: [],
    accountToken: localStorage.getItem('usms.v6.accountToken') || '',
    messageRows: new Map(),
    messagePayloads: new Map(),
    selectedMessageId: null,
    replyTo: null,
    pinnedMessages: [],
    accountToken: localStorage.getItem('usms.v6.accountToken') || '',
    typingTimer: null,
    audioCtx: null,
    mediaRecorder: null,
    recorderChunks: [],
    recorderKind: null,
    call: { pc: null, localStream: null, remoteStream: null, targetId: null, targetProfile: null, active: false, incoming: null, video: false, muted: false, cameraOff: false, facingMode: 'user', candidateQueue: [], fit: 'contain' },
    groupCall: { api: null, active: false, minimized: false, roomName: '', url: '' }
  };

  init();

  async function init() {
    state.settings = { theme:'aurora', wallpaper:'pro-midnight', bubble:'modern', font:'normal', sound:'prism', quality:'hd', secretMode:false, expire:'never', selfMirror:false, enterSend:true, rememberAccount:true, ...state.settings };
    applySettings();
    populateProfileFields();
    applyInviteFromUrl();
    bindUi();
    renderEmojiPanel();
    await loadConfig();
    connectWs();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  function loadJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function nowTime(ts = Date.now()) { return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  function initials(name) { const s = String(name || 'U').trim(); const p = s.split(/\s+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : s.slice(0,2)).toUpperCase(); }
  function normalizeUsername(value){
    const raw = String(value || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '').slice(0,32);
    return raw || String(state.profile?.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0,20) || 'user';
  }
  function showName(){
    return state.roomMeta?.title || state.me.room || 'Oda';
  }
  function escapeHtml(t) { return String(t).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function bytesToB64(bytes) { let s = ''; const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (let i=0;i<a.length;i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function b64ToBytes(b64) { const s = atob(b64); const a = new Uint8Array(s.length); for (let i=0;i<s.length;i++) a[i] = s.charCodeAt(i); return a; }
  function formatBytes(n){ if(n<1024) return `${n} B`; if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`; return `${(n/1024/1024).toFixed(1)} MB`; }
  function toast(text, ms=3200){ const x=document.createElement('div'); x.className='toast'; x.textContent=text; els.toastArea.appendChild(x); setTimeout(()=>x.remove(),ms); }
  function setStatus(kind, text){ els.serverStatus.className = `server-status ${kind || ''}`; els.serverStatus.querySelector('span').textContent = text; }
  function wsUrl(){ return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`; }
  function sendWs(type, payload={}){ if(!state.ws || state.ws.readyState !== WebSocket.OPEN) return false; state.ws.send(JSON.stringify({type, ...payload})); return true; }

  function bindUi(){
    els.loginForm.addEventListener('submit', (e)=>{ e.preventDefault(); join(); });
    els.avatarPickBtn.onclick = () => els.avatarInput.click();
    els.avatarInput.onchange = (e) => handleAvatarFile(e.target.files[0], true);
    els.profileAvatarBtn.onclick = () => els.avatarInput.click();
    if (els.openMainMenuBtn) els.openMainMenuBtn.onclick = () => els.mainMenuModal.classList.remove('hidden');
    if (els.closeMainMenuBtn) els.closeMainMenuBtn.onclick = () => els.mainMenuModal.classList.add('hidden');
    if (els.shareInviteBtn) els.shareInviteBtn.onclick = () => { els.mainMenuModal.classList.add('hidden'); copyInvite(); };
    if (els.openRoomSettingsBtn) els.openRoomSettingsBtn.onclick = openRoomSettings;
    if (els.closeRoomSettingsBtn) els.closeRoomSettingsBtn.onclick = () => els.roomSettingsModal.classList.add('hidden');
    if (els.roomAvatarBtn) els.roomAvatarBtn.onclick = () => els.roomAvatarInput.click();
    if (els.roomAvatarInput) els.roomAvatarInput.onchange = (e) => handleRoomAvatarFile(e.target.files[0]);
    if (els.saveRoomSettingsBtn) els.saveRoomSettingsBtn.onclick = saveRoomSettings;
    if (els.openContactsBtn) els.openContactsBtn.onclick = openContactsModal;
    if (els.contactsTabBtn) els.contactsTabBtn.onclick = openContactsModal;
    if (els.openContactsFromMenuBtn) els.openContactsFromMenuBtn.onclick = () => { els.mainMenuModal.classList.add('hidden'); openContactsModal(); };
    if (els.openGroupCallFromMenuBtn) els.openGroupCallFromMenuBtn.onclick = () => { els.mainMenuModal.classList.add('hidden'); startGroupCall(); };
    if (els.closeContactsBtn) els.closeContactsBtn.onclick = () => els.contactsModal.classList.add('hidden');
    if (els.addContactBtn) els.addContactBtn.onclick = addContactByUsername;
    if (els.callBackBtn) els.callBackBtn.onclick = minimizeCall;
    if (els.groupCallBackBtn) els.groupCallBackBtn.onclick = minimizeGroupCall;
    if (els.groupCallInviteBtn) els.groupCallInviteBtn.onclick = copyGroupCallInvite;
    if (els.groupCallOpenExternalBtn) els.groupCallOpenExternalBtn.onclick = openGroupCallExternal;
    if (els.groupCallLeaveBtn) els.groupCallLeaveBtn.onclick = endGroupCall;
    if (els.callView) els.callView.addEventListener('click', (e) => {
      if (!els.callView.classList.contains('minimized')) return;
      if (e.target.closest('button,select')) return;
      restoreCall();
    });
    if (els.groupCallView) els.groupCallView.addEventListener('click', (e) => {
      if (!els.groupCallView.classList.contains('minimized')) return;
      if (e.target.closest('button,select,a,iframe')) return;
      restoreGroupCall();
    });
    els.messageInput.addEventListener('input', () => { autoGrow(els.messageInput); sendTyping(); });
    els.messageInput.addEventListener('keydown', (e)=>{ if(state.settings.enterSend !== false && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } });
    els.sendBtn.onclick = sendTextMessage;
    els.emojiBtn.onclick = () => els.emojiPanel.classList.toggle('hidden');
    els.attachBtn.onclick = () => els.fileInput.click();
    els.fileInput.onchange = (e) => handleFile(e.target.files[0]);
    els.cameraShotBtn.onclick = () => els.cameraInput.click();
    els.cameraInput.onchange = (e) => handleFile(e.target.files[0]);
    els.voiceBtn.onclick = () => toggleRecording('audio');
    els.videoNoteBtn.onclick = () => toggleRecording('video');
    els.copyInviteBtn.onclick = copyInvite;
    els.securityBtn.onclick = showSecurity;
    els.closeSecurityBtn.onclick = () => els.securityModal.classList.add('hidden');
    els.audioCallBtn.onclick = () => startCall(false);
    els.videoCallBtn.onclick = () => startCall(true);
    if (els.groupCallBtn) els.groupCallBtn.onclick = startGroupCall;
    els.acceptCallBtn.onclick = acceptIncoming;
    els.rejectCallBtn.onclick = rejectIncoming;
    els.endCallBtn.onclick = () => endCall(true);
    els.muteBtn.onclick = toggleMute;
    els.cameraBtn.onclick = toggleCamera;
    els.switchCamBtn.onclick = switchCamera;
    els.fitBtn.onclick = toggleFit;
    els.snapshotBtn.onclick = snapshotCall;
    if (els.callInviteBtn) els.callInviteBtn.onclick = copyCallInvite;
    els.qualitySelect.onchange = () => applyCallQuality(els.qualitySelect.value);
    els.videoEffectSelect.onchange = () => setCallEffect(els.videoEffectSelect.value);
    els.roomInfoBtn.onclick = () => openInfoPanel();
    els.closeInfoBtn.onclick = () => els.infoPanel.classList.remove('open');
    els.openProfileBtn.onclick = openProfileModal;
    els.closeProfileBtn.onclick = () => els.profileModal.classList.add('hidden');
    els.saveProfileBtn.onclick = saveProfileFromModal;
    els.openSettingsBtn.onclick = () => { if (els.mainMenuModal) els.mainMenuModal.classList.add('hidden'); openSettingsModal(); };
    els.closeSettingsBtn.onclick = () => els.settingsModal.classList.add('hidden');
    els.saveSettingsBtn.onclick = saveSettingsFromModal; setupSettingsLivePreview();
    if (els.settingsSecurityBtn) els.settingsSecurityBtn.onclick = showSecurity;
    document.querySelectorAll('.settings-tab').forEach((btn)=>btn.onclick=()=>switchSettingsTab(btn.dataset.settingsTab));
    els.testSoundBtn.onclick = () => playSound('message');
    els.notificationPermissionBtn.onclick = requestNotifications;
    els.newStatusBtn.onclick = () => els.statusModal.classList.remove('hidden');
    els.closeStatusBtn.onclick = () => els.statusModal.classList.add('hidden');
    els.sendStatusBtn.onclick = sendStatus;
    els.savePeerNoteBtn.onclick = savePeerNote;
    if (els.startPrivateChatBtn) els.startPrivateChatBtn.onclick = startPrivateChat;
    if (els.closeMessageActionBtn) els.closeMessageActionBtn.onclick = () => els.messageActionModal.classList.add('hidden');
    if (els.replyMessageBtn) els.replyMessageBtn.onclick = replySelectedMessage;
    if (els.copyMessageBtn) els.copyMessageBtn.onclick = copySelectedMessage;
    if (els.editMessageBtn) els.editMessageBtn.onclick = editSelectedMessage;
    if (els.deleteMessageBtn) els.deleteMessageBtn.onclick = deleteSelectedMessage;
    if (els.pinMessageBtn) els.pinMessageBtn.onclick = pinSelectedMessage;
    if (els.reactMessageBtn) els.reactMessageBtn.onclick = reactSelectedMessage;
    if (els.cancelReplyBtn) els.cancelReplyBtn.onclick = clearReply;
    if (els.openMediaGalleryBtn) els.openMediaGalleryBtn.onclick = openMediaGallery;
    if (els.closeMediaGalleryBtn) els.closeMediaGalleryBtn.onclick = () => els.mediaGalleryModal.classList.add('hidden');
    if (els.openAccountBtn) els.openAccountBtn.onclick = openAccountModal;
    if (els.closeAccountBtn) els.closeAccountBtn.onclick = () => els.accountModal.classList.add('hidden');
    if (els.accountRegisterBtn) els.accountRegisterBtn.onclick = accountRegister;
    if (els.accountLoginBtn) els.accountLoginBtn.onclick = accountLogin;
    els.searchInput.addEventListener('input', filterMessages);
    document.querySelectorAll('.rail-btn[data-tab]').forEach((b)=>b.onclick=()=>{ document.querySelectorAll('.rail-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); if(b.dataset.tab==='settings') openSettingsModal(); if(b.dataset.tab==='status') els.statusModal.classList.remove('hidden'); });
  }

  function populateProfileFields(){
    els.nameInput.value = state.profile.name || '';
    if (els.usernameInput) els.usernameInput.value = state.profile.username ? '@'+state.profile.username : '';
    els.emailInput.value = state.profile.email || '';
    els.phoneInput.value = state.profile.phone || '';
    els.bioInput.value = state.profile.bio || '';
    renderAvatarPreviews();
  }

  function renderAvatarPreviews(){
    const init = initials(state.profile.name || 'HA');
    for (const [textEl, imgEl, btnEl] of [[els.avatarPreviewText, els.avatarPreview, els.avatarPickBtn], [els.profileAvatarText, els.profileAvatarImg, els.profileAvatarBtn], [els.myAvatar, els.myAvatarImg, els.openProfileBtn]]) {
      if (!textEl || !imgEl || !btnEl) continue;
      textEl.textContent = init;
      if (state.profile.avatar) { imgEl.src = state.profile.avatar; btnEl.classList.add('has-img'); }
      else { imgEl.removeAttribute('src'); btnEl.classList.remove('has-img'); }
    }
  }

  function handleAvatarFile(file, updateInputs=false){
    if(!file) return;
    if(!file.type.startsWith('image/')) return toast('Sadece resim yükleyebilirsin.');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        state.profile.avatar = await resizeImage(reader.result, 420, 0.84);
        if(state.profile.avatar.length > DEFAULT_AVATAR_LIMIT) state.profile.avatar = await resizeImage(reader.result, 300, 0.74);
        saveJson(STORE_PROFILE, state.profile); renderAvatarPreviews(); broadcastProfile(); if(updateInputs) toast('Profil fotoğrafı hazır.');
      } catch { toast('Fotoğraf hazırlanamadı.'); }
    };
    reader.readAsDataURL(file);
  }

  function resizeImage(dataUrl, maxSize=420, quality=.82){
    return new Promise((resolve,reject)=>{
      const img = new Image(); img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)); const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h); resolve(c.toDataURL('image/jpeg', quality));
      }; img.onerror=reject; img.src=dataUrl;
    });
  }

  async function loadConfig(){
    try { const r = await fetch('/config', {cache:'no-store'}); if(r.ok) state.config = await r.json(); setStatus('ok', state.config.turnReady ? 'Sunucu + TURN hazır ✓' : 'Sunucu hazır, TURN ayarı eksik'); }
    catch { setStatus('bad','Sunucuya bağlanılamadı'); }
  }

  function connectWs(){
    state.ws = new WebSocket(wsUrl());
    state.ws.onopen = () => { state.connected = true; els.wsStatus.textContent='çevrimiçi'; setStatus('ok', state.config.turnReady ? 'Sunucu + TURN hazır ✓' : 'Sunucu hazır, TURN ayarı eksik'); if(state.me.room && state.me.roomKey) sendJoin(); };
    state.ws.onclose = () => { state.connected=false; els.wsStatus.textContent='yeniden bağlanıyor...'; setTimeout(connectWs, 1600); };
    state.ws.onerror = () => setStatus('bad','WebSocket hatası');
    state.ws.onmessage = async (event) => { let msg; try{ msg=JSON.parse(event.data); }catch{return;} await handleWs(msg); };
  }

  async function handleWs(msg){
    switch(msg.type){
      case 'hello': state.me.peerId = msg.peerId; break;
      case 'joined': await onJoined(msg); break;
      case 'peer-joined': upsertPeer(msg.peerId, msg.profile); renderPeers(); updateHeader(); toast(`${msg.profile?.name || 'Kullanıcı'} odaya katıldı.`); break;
      case 'peer-left': removePeer(msg.peerId); renderPeers(); updateHeader(); break;
      case 'profile-update': if(msg.profile) upsertPeer(msg.peerId, msg.profile); renderPeers(); renderContacts(); updateHeader(); break;
      case 'room-meta-update': state.roomMeta = {...state.roomMeta, ...(msg.roomMeta || {})}; renderRoomMeta(); break;
      case 'room-message': await receiveMessage(msg.message); break;
      case 'status-post': await receiveStatus(msg.status); break;
      case 'typing': showTyping(msg); break;
      case 'signal': await handleSignal(msg); break;
      case 'error': toast(msg.message || 'Hata oluştu.'); break;
    }
  }

  async function join(){
    state.profile.name = els.nameInput.value.trim() || 'Kullanıcı';
    state.profile.username = normalizeUsername(els.usernameInput?.value || state.profile.username || state.profile.name);
    state.profile.email = els.emailInput.value.trim(); state.profile.phone = els.phoneInput.value.trim(); state.profile.bio = els.bioInput.value.trim(); state.profile.status = state.profile.bio || 'çevrimiçi';
    state.me.room = els.roomInput.value.trim(); state.me.password = els.passwordInput.value;
    if(!state.me.room || !state.me.password) return toast('Oda adı ve parola gerekli.');
    saveJson(STORE_PROFILE, state.profile); renderAvatarPreviews();
    setStatus('', 'Anahtar hazırlanıyor...');
    state.me.pwTag = await sha256Hex(`USMS-AUTH|${state.me.room}|${state.me.password}`);
    state.me.roomKey = await deriveRoomKey(state.me.room, state.me.password);
    sendJoin();
  }

  function sendJoin(){
    if(!sendWs('join', { room: state.me.room, pwTag: state.me.pwTag, profile: state.profile })) return setStatus('bad','Sunucu bağlantısı bekleniyor...');
  }

  async function onJoined(msg){
    state.joined = true; state.me.peerId = msg.peerId; state.profiles = msg.profiles || {}; state.roomMeta = msg.roomMeta || { title: state.me.room, description: '', avatar: '' }; state.peers.clear();
    for(const p of (msg.roster || [])) if(p.peerId !== state.me.peerId) upsertPeer(p.peerId, p);
    els.loginView.classList.add('hidden'); els.appView.classList.remove('hidden');
    els.myName.textContent = state.profile.name; els.roomTime.textContent = nowTime(); renderRoomMeta();
    els.messages.innerHTML = '<div class="day-pill">Bugün</div><div class="system-pill">🔒 Bu oda şifreli ve kalıcıdır. Aynı oda + parola ile tekrar girince geçmiş yüklenir.</div>';
    state.messagesSeen.clear(); renderPeers(); renderContacts(); updateHeader(); renderAvatarPreviews();
    for(const item of (msg.history || [])) await receiveMessage(item, true);
    els.messages.scrollTop = els.messages.scrollHeight;
    for(const st of (msg.statuses || [])) await receiveStatus(st, true);
    if(state.pendingPrivateTitle){ state.roomMeta = { ...(state.roomMeta || {}), title: state.pendingPrivateTitle, description:'Kişiye özel şifreli sohbet' }; renderRoomMeta(); sendWs('room-meta-update',{roomMeta:state.roomMeta}); state.pendingPrivateTitle=null; }
    toast('Odaya güvenli giriş yapıldı.');
    if (state.invite.call) setTimeout(() => toast('Arama davetiyle geldin. Odadaki kişi seni arayabilir veya sen görüntülü arama başlatabilirsin.'), 700);
    if (state.invite.groupCall) setTimeout(() => startGroupCall(), 900);
  }

  async function sha256Hex(text){ const hash=await crypto.subtle.digest('SHA-256', enc.encode(text)); return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function deriveRoomKey(room, password){
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const salt = enc.encode(`USMS-MOBILE-ROOM-v5|${room}`);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:160000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  async function encryptRoom(obj){ const iv=crypto.getRandomValues(new Uint8Array(12)); const clear=enc.encode(JSON.stringify(obj)); const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},state.me.roomKey,clear); return {v:5,iv:bytesToB64(iv),data:bytesToB64(data)}; }
  async function decryptRoom(cipher){ const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(cipher.iv)}, state.me.roomKey, b64ToBytes(cipher.data)); return JSON.parse(dec.decode(clear)); }

  function upsertPeer(peerId, profile){ if(!peerId || peerId === state.me.peerId) return; const old=state.peers.get(peerId)||{}; const merged={...old,...profile,peerId}; state.peers.set(peerId,merged); if(profile?.profileId) state.profiles[profile.profileId]=merged; if(!state.selectedPeerId) state.selectedPeerId=peerId; }
  function removePeer(peerId){ state.peers.delete(peerId); if(state.selectedPeerId===peerId) state.selectedPeerId = state.peers.keys().next().value || null; }
  function renderPeers(){
    els.peerList.innerHTML='';
    if(!state.peers.size){ els.peerList.innerHTML='<div class="peer-item"><div class="pavatar">+</div><div><strong>Henüz kimse yok</strong><span>Davet linkini paylaş</span></div></div>'; return; }
    for(const [id,p] of state.peers){ const item=document.createElement('button'); item.className=`peer-item ${id===state.selectedPeerId?'selected':''}`; item.onclick=()=>{ state.selectedPeerId=id; state.selectedProfileId=p.profileId; renderPeers(); openInfoPanel(p); };
      const user = p.username ? '@'+p.username : (p.status || 'çevrimiçi');
      item.innerHTML=`<div class="pavatar">${p.avatar?`<img src="${p.avatar}" alt="">`:escapeHtml(initials(p.name))}<i class="online-dot"></i></div><div><strong>${escapeHtml(p.name||'Kullanıcı')}</strong><span>${escapeHtml(user)}</span></div><small>›</small>`;
      els.peerList.appendChild(item); }
  }
  function renderRoomMeta(){
    const title = showName();
    const desc = state.roomMeta?.description || (state.peers.size ? `${state.peers.size} kişi çevrimiçi` : 'Davet bilgilerini paylaş.');
    if(els.roomTitle) els.roomTitle.textContent = title;
    if(els.chatRoomName) els.chatRoomName.textContent = title;
    if(els.roomSubtitle) els.roomSubtitle.textContent = desc;
    const setAvatar=(el)=>{ if(!el) return; if(state.roomMeta?.avatar){ el.innerHTML=`<img src="${state.roomMeta.avatar}" alt="">`; } else { el.textContent='US'; } };
    setAvatar(els.roomAvatar); setAvatar(els.chatRoomAvatar);
  }
  function updateHeader(){ const total=state.peers.size+1; els.chatSub.textContent=`${total} kişi · şifreli oda`; renderRoomMeta(); }

  async function sendTextMessage(){
    const text=els.messageInput.value.trim();
    if(!text) return;
    els.messageInput.value=''; autoGrow(els.messageInput);
    const payload = { type:'text', text };
    if (state.replyTo) payload.replyTo = state.replyTo;
    const exp = state.settings.expire && state.settings.expire !== 'never' ? Number(state.settings.expire) : 0;
    if (exp) payload.expiresAt = Date.now() + exp * 1000;
    await sendEncryptedMessage(payload);
    clearReply();
    playSound('sent');
  }
  async function sendEncryptedMessage(payload, kind = payload.type || 'text'){
    if(!state.joined) return toast('Önce odaya gir.');
    const id=crypto.randomUUID(); const ts=Date.now(); const cipher=await encryptRoom({ ...payload, id, ts, fromProfileId: state.profile.profileId });
    sendWs('room-message', { id, ts, kind, cipher, ephemeral: Boolean(state.settings.secretMode) });
  }
  async function receiveMessage(item, silent=false){
    if(!item || state.messagesSeen.has(item.id)) return; state.messagesSeen.add(item.id);
    let payload; try{ payload=await decryptRoom(item.cipher); } catch { return; }
    if (payload.type === 'delete') { applyMessageDelete(payload.targetId); return; }
    if (payload.type === 'edit') { applyMessageEdit(payload.targetId, payload.text); return; }
    if (payload.type === 'reaction') { applyMessageReaction(payload.targetId, payload.reaction || '❤️'); return; }
    if (payload.expiresAt && Date.now() > payload.expiresAt) return;
    addMessage({ id:item.id, mine:item.fromPeerId===state.me.peerId || item.fromProfileId===state.profile.profileId, sender:item.senderName, avatar:item.senderAvatar, color:item.senderColor, ts:item.ts, payload });
    if(!silent && item.fromPeerId!==state.me.peerId){ playSound('message'); notify(item.senderName || 'USMS', payload.text || payload.caption || 'Yeni mesaj'); }
  }
  function addMessage({id,mine,sender,ts,payload}){
    const row=document.createElement('div');
    row.className=`msg-row ${mine?'me':'you'}`;
    row.dataset.id = id || payload.id || '';
    row.dataset.text = `${sender||''} ${payload.text||''} ${payload.caption||''}`.toLowerCase();
    const bubble=document.createElement('div');
    bubble.className='bubble';

    if(payload.replyTo){
      const rp=document.createElement('button');
      rp.className='reply-inside';
      rp.textContent = `↩ ${String(payload.replyTo.text || 'Mesaj').slice(0,70)}`;
      rp.onclick=(e)=>{ e.stopPropagation(); const target=state.messageRows.get(payload.replyTo.id); if(target) target.scrollIntoView({behavior:'smooth',block:'center'}); };
      bubble.appendChild(rp);
    }

    if(!mine && sender){ const s=document.createElement('span'); s.className='sender'; s.textContent=sender; bubble.appendChild(s); }
    if(payload.attachment) bubble.appendChild(renderAttachment(payload.attachment));
    if(payload.text){ const t=document.createElement('span'); t.className='message-text'; t.textContent=payload.text; bubble.appendChild(t); }
    if(payload.caption){ const c=document.createElement('span'); c.className='message-text'; c.textContent=payload.caption; bubble.appendChild(c); }
    const meta=document.createElement('span'); meta.className='msg-meta'; meta.innerHTML=`${nowTime(ts)} ${mine?'<span class="ticks">✓✓</span>':''}`; bubble.appendChild(meta);
    row.appendChild(bubble); els.messages.appendChild(row); els.messages.scrollTop=els.messages.scrollHeight;

    const messageId = id || payload.id;
    if(messageId){
      state.messageRows.set(messageId,row);
      state.messagePayloads.set(messageId,{...payload,mine,sender,ts,id:messageId});
      bubble.addEventListener('click',()=>openMessageActions(messageId));
      let pressTimer=null;
      bubble.addEventListener('touchstart',()=>{ pressTimer=setTimeout(()=>openMessageActions(messageId),430); },{passive:true});
      bubble.addEventListener('touchend',()=>clearTimeout(pressTimer));
      bubble.addEventListener('touchmove',()=>clearTimeout(pressTimer));
    }

    pruneMessageDom();
    if(payload.expiresAt){ setTimeout(()=>applyMessageDelete(messageId,true), Math.max(1000,payload.expiresAt-Date.now())); }
  }
  function pruneMessageDom(limit=420){
    const rows=[...els.messages.querySelectorAll('.msg-row')];
    if(rows.length<=limit) return;
    for(const row of rows.slice(0, rows.length-limit)){
      const id=row.dataset.id;
      if(id) state.messageRows.delete(id);
      row.remove();
    }
  }
  function openMessageActions(id){
    state.selectedMessageId=id;
    els.messageActionModal.classList.remove('hidden');
  }
  function selectedPayload(){ return state.messagePayloads.get(state.selectedMessageId); }
  function replySelectedMessage(){ const p=selectedPayload(); if(!p) return; state.replyTo={id:state.selectedMessageId,text:p.text || p.caption || (p.attachment?.name || 'Dosya')}; if(els.replyPreviewText) els.replyPreviewText.textContent=`Cevaplanıyor: ${state.replyTo.text.slice(0,90)}`; els.replyPreview?.classList.remove('hidden'); els.messageActionModal.classList.add('hidden'); els.messageInput.focus(); }
  function clearReply(){ state.replyTo=null; els.replyPreview?.classList.add('hidden'); }
  function copySelectedMessage(){ const p=selectedPayload(); const txt=p?.text || p?.caption || p?.attachment?.name || ''; navigator.clipboard.writeText(txt).then(()=>toast('Mesaj kopyalandı.')).catch(()=>toast(txt,6000)); els.messageActionModal.classList.add('hidden'); }
  async function editSelectedMessage(){ const p=selectedPayload(); if(!p || !p.mine) return toast('Sadece kendi mesajını düzenleyebilirsin.'); const next=prompt('Mesajı düzenle', p.text || ''); if(next===null) return; await sendEncryptedMessage({type:'edit',targetId:state.selectedMessageId,text:next},'edit'); applyMessageEdit(state.selectedMessageId,next); els.messageActionModal.classList.add('hidden'); }
  async function deleteSelectedMessage(){ const p=selectedPayload(); if(!p || !p.mine) return toast('Sadece kendi mesajını silebilirsin.'); await sendEncryptedMessage({type:'delete',targetId:state.selectedMessageId},'delete'); applyMessageDelete(state.selectedMessageId); els.messageActionModal.classList.add('hidden'); }
  function pinSelectedMessage(){ const p=selectedPayload(); if(!p) return; state.pinnedMessages.unshift({id:state.selectedMessageId,text:p.text || p.caption || p.attachment?.name || 'Mesaj'}); state.pinnedMessages=state.pinnedMessages.slice(0,10); toast('Mesaj sabitlendi.'); els.messageActionModal.classList.add('hidden'); }
  async function reactSelectedMessage(){ await sendEncryptedMessage({type:'reaction',targetId:state.selectedMessageId,reaction:'❤️'},'reaction'); applyMessageReaction(state.selectedMessageId,'❤️'); els.messageActionModal.classList.add('hidden'); }
  function applyMessageDelete(id,expired=false){ const row=state.messageRows.get(id); if(!row) return; row.classList.add('deleted'); const bubble=row.querySelector('.bubble'); if(bubble) bubble.innerHTML=`<span class="message-text">${expired?'Süresi dolan mesaj silindi.':'Bu mesaj silindi.'}</span>`; }
  function applyMessageEdit(id,text){ const row=state.messageRows.get(id); if(!row) return; const t=row.querySelector('.message-text'); if(t) t.textContent=text; const p=state.messagePayloads.get(id); if(p){p.text=text;p.edited=true;} const meta=row.querySelector('.msg-meta'); if(meta && !meta.textContent.includes('düzenlendi')) meta.innerHTML += ' · düzenlendi'; }
  function applyMessageReaction(id,reaction){ const row=state.messageRows.get(id); if(!row) return; let r=row.querySelector('.reaction-pill'); if(!r){r=document.createElement('span'); r.className='reaction-pill'; row.querySelector('.bubble')?.appendChild(r);} r.textContent=reaction; }
  function openMediaGallery(){
    const items=[...state.messagePayloads.values()].filter(p=>p.attachment);
    els.mediaGalleryList.innerHTML='';
    if(!items.length){ els.mediaGalleryList.innerHTML='<div class="empty-small">Henüz medya veya dosya yok.</div>'; }
    for(const p of items){ const a=p.attachment; const card=document.createElement('div'); card.className='media-card'; if(a.type?.startsWith('image/')) card.innerHTML=`<img src="${a.data}" alt=""><span>${escapeHtml(a.name||'Resim')}</span>`; else if(a.type?.startsWith('video/')) card.innerHTML=`<video src="${a.data}" controls playsinline></video><span>${escapeHtml(a.name||'Video')}</span>`; else card.innerHTML=`<div class="file-card"><span>📎</span><span><b>${escapeHtml(a.name||'Dosya')}</b><small>${formatBytes(a.size||0)}</small></span><a download="${escapeHtml(a.name||'dosya')}" href="${a.data}">İndir</a></div>`; els.mediaGalleryList.appendChild(card); }
    els.mainMenuModal?.classList.add('hidden');
    els.mediaGalleryModal.classList.remove('hidden');
  }
  function openAccountModal(){ els.mainMenuModal?.classList.add('hidden'); els.accountUsernameInput.value=state.profile.username?'@'+state.profile.username:''; els.accountNameInput.value=state.profile.name||''; els.accountState.textContent=state.accountToken?'Giriş aktif.':'Henüz giriş yapılmadı.'; els.accountModal.classList.remove('hidden'); }
  async function accountRegister(){ await accountRequest('/api/register'); }
  async function accountLogin(){ await accountRequest('/api/login'); }
  async function accountRequest(url){
    try{
      const raw=String(els.accountUsernameInput.value||'').trim().toLowerCase().replace(/^@+/,'').replace(/[^a-z0-9_]/g,'').slice(0,32);
      const username=raw;
      const password=els.accountPasswordInput.value; const name=els.accountNameInput.value.trim()||state.profile.name||username;
      if(!username || !password) return toast('Kullanıcı adı ve hesap şifresi gerekli.');
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,profile:{...state.profile,username,name}})});
      const data=await res.json(); if(!res.ok) throw new Error(data.message||'İşlem başarısız');
      if(data.token){ state.accountToken=data.token; localStorage.setItem('usms.v6.accountToken',data.token); }
      if(data.profile){ state.profile={...state.profile,...data.profile}; saveJson(STORE_PROFILE,state.profile); renderAvatarPreviews(); populateProfileFields(); broadcastProfile(); }
      els.accountState.textContent='Hesap aktif: @'+username; toast('Hesap işlemi tamam.');
    }catch(e){ toast(e.message||'Hesap işlemi başarısız.'); }
  }

  function renderAttachment(a){
    const box=document.createElement('div'); box.className='attachment';
    if(a.type?.startsWith('image/')){ const img=document.createElement('img'); img.loading='lazy'; img.decoding='async'; img.src=a.data; img.alt=a.name||'resim'; box.appendChild(img); }
    else if(a.type?.startsWith('video/')){ const v=document.createElement('video'); v.src=a.data; v.controls=true; v.playsInline=true; v.preload='metadata'; box.appendChild(v); }
    else if(a.type?.startsWith('audio/')){ const au=document.createElement('audio'); au.src=a.data; au.controls=true; au.preload='metadata'; box.appendChild(au); }
    else { const card=document.createElement('div'); card.className='file-card'; card.innerHTML=`<span>📎</span><span><b>${escapeHtml(a.name||'Dosya')}</b><small>${formatBytes(a.size||0)}</small></span><a download="${escapeHtml(a.name||'dosya')}" href="${a.data}">İndir</a>`; box.appendChild(card); }
    return box;
  }

  function handleFile(file){
    if(!file) return;
    const max=state.config.maxUploadBytes || 10*1024*1024;
    if(file.size > max) return toast(`Dosya büyük. Limit: ${formatBytes(max)}`);
    const r=new FileReader(); r.onload=async()=>{ await sendEncryptedMessage({type:'attachment', text:'', attachment:{name:file.name,type:file.type||'application/octet-stream',size:file.size,data:r.result}}, 'attachment'); playSound('sent'); };
    r.readAsDataURL(file);
  }

  async function toggleRecording(kind){
    if(state.mediaRecorder && state.mediaRecorder.state === 'recording') return stopRecording();
    try{
      const stream = await navigator.mediaDevices.getUserMedia(kind==='video'?{audio:true,video:mediaVideoConstraints()}:{audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      state.recorderChunks=[]; state.recorderKind=kind; const mime = pickMime(kind);
      state.mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.mediaRecorder.ondataavailable = (e)=>{ if(e.data.size) state.recorderChunks.push(e.data); };
      state.mediaRecorder.onstop = async()=>{ const blob=new Blob(state.recorderChunks,{type:state.mediaRecorder.mimeType}); stream.getTracks().forEach(t=>t.stop()); const data=await blobToDataUrl(blob); await sendEncryptedMessage({type:'attachment', attachment:{name:kind==='video'?'video-mesaj.webm':'sesli-mesaj.webm', type:blob.type, size:blob.size, data}}, kind==='video'?'video-note':'voice-note'); state.mediaRecorder=null; els.voiceBtn.classList.remove('recording'); els.videoNoteBtn.classList.remove('recording'); };
      state.mediaRecorder.start(); (kind==='video'?els.videoNoteBtn:els.voiceBtn).classList.add('recording'); toast(`${kind==='video'?'Video':'Ses'} kaydı başladı. Bitirmek için tekrar bas.`);
      setTimeout(()=>{ if(state.mediaRecorder?.state==='recording') stopRecording(); }, kind==='video'?20000:120000);
    }catch{ toast('Mikrofon/kamera izni alınamadı.'); }
  }
  function stopRecording(){ if(state.mediaRecorder?.state==='recording') state.mediaRecorder.stop(); }
  function pickMime(kind){ const list=kind==='video'?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['audio/webm;codecs=opus','audio/webm']; return list.find(MediaRecorder.isTypeSupported) || ''; }
  function blobToDataUrl(blob){ return new Promise((resolve)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(blob); }); }

  function renderEmojiPanel(){ els.emojiPanel.innerHTML=''; for(const e of EMOJIS){ const b=document.createElement('button'); b.textContent=e; b.onclick=()=>{ insertAtCursor(els.messageInput,e); els.messageInput.focus(); }; els.emojiPanel.appendChild(b); } }
  function insertAtCursor(el,text){ const s=el.selectionStart||0,e=el.selectionEnd||0; el.value=el.value.slice(0,s)+text+el.value.slice(e); el.selectionStart=el.selectionEnd=s+text.length; autoGrow(el); }
  function autoGrow(el){ el.style.height='auto'; el.style.height=Math.min(130,el.scrollHeight)+'px'; }
  function sendTyping(){ sendWs('typing',{active:true}); clearTimeout(state.typingTimer); state.typingTimer=setTimeout(()=>sendWs('typing',{active:false}),900); }
  function showTyping(msg){ els.typingLine.textContent = msg.active ? `${msg.name || 'Kullanıcı'} yazıyor...` : ''; els.typingLine.classList.toggle('hidden', !msg.active); }
  function filterMessages(){ const q=els.searchInput.value.trim().toLowerCase(); document.querySelectorAll('.msg-row').forEach(r=>r.style.display = !q || r.dataset.text.includes(q) ? '' : 'none'); }

  async function sendStatus(){ const text=els.statusInput.value.trim(); if(!text) return; const cipher=await encryptRoom({type:'status',text,ts:Date.now(),fromProfileId:state.profile.profileId}); sendWs('status-post',{id:crypto.randomUUID(),cipher}); els.statusInput.value=''; els.statusModal.classList.add('hidden'); }
  async function receiveStatus(item,silent=false){ let p; try{p=await decryptRoom(item.cipher);}catch{return;} const el=document.createElement('div'); el.className='status-item'; el.innerHTML=`<strong>${escapeHtml(item.senderName||'Kullanıcı')}</strong><p>${escapeHtml(p.text||'')}</p>`; if(els.statusList.querySelector('.empty-small')) els.statusList.innerHTML=''; els.statusList.prepend(el); if(!silent) toast('Yeni durum paylaşıldı.'); }

  async function groupCallRoomName(){
    const base = `${state.me.room}|${state.me.pwTag || await sha256Hex('fallback|' + state.me.room + '|' + state.me.password)}`;
    const hash = await sha256Hex('USMS-GROUP-CALL|' + base);
    return 'usms-' + hash.slice(0, 36);
  }

  function jitsiDomain(){
    return String(state.config.jitsiDomain || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }

  function groupCallUrl(){
    return state.groupCall.url || `https://${jitsiDomain()}/${state.groupCall.roomName || 'usms'}`;
  }

  function loadJitsiScript(){
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) return resolve();
      const old = document.querySelector('script[data-usms-jitsi="1"]');
      if (old) old.remove();

      const script = document.createElement('script');
      script.dataset.usmsJitsi = '1';
      script.src = `https://${jitsiDomain()}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Jitsi API yüklenemedi'));
      document.head.appendChild(script);
    });
  }

  async function startGroupCall(){
    if (!state.joined) return toast('Önce odaya gir.');
    if (state.groupCall.active) return restoreGroupCall();

    try {
      const roomName = await groupCallRoomName();
      const url = `https://${jitsiDomain()}/${roomName}`;
      state.groupCall.roomName = roomName;
      state.groupCall.url = url;
      state.groupCall.active = true;

      els.groupCallView.classList.remove('hidden', 'minimized');
      document.body.classList.remove('group-call-minimized-active');
      els.groupCallLoading.classList.remove('hidden');
      els.groupCallTitle.textContent = `${showName()} · Grup Araması`;
      els.jitsiContainer.innerHTML = '';

      // Önce embedded dene. Mobilde/iframe'de sorun olursa kullanıcıya dışarıda aç butonu gösterilir.
      await loadJitsiScript();

      const api = new JitsiMeetExternalAPI(jitsiDomain(), {
        roomName,
        parentNode: els.jitsiContainer,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: state.profile.name || state.profile.username || 'USMS',
          email: state.profile.email || undefined
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          p2p: { enabled: false }
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
        }
      });

      state.groupCall.api = api;

      let joined = false;
      const fallbackTimer = setTimeout(() => {
        if (!joined && state.groupCall.active) {
          els.groupCallLoading.innerHTML = '<strong>Grup araması gömülü açılmadı.</strong><span>Telefonlarda bu normal olabilir. “Aç” butonuna basıp ayrı sekmede devam et.</span>';
        }
      }, 6500);

      api.addListener('videoConferenceJoined', () => {
        joined = true;
        clearTimeout(fallbackTimer);
        els.groupCallLoading.classList.add('hidden');
        try { api.executeCommand('subject', `${showName()} · USMS Grup Araması`); } catch {}
        toast('Grup aramasına katıldın.');
      });

      api.addListener('readyToClose', () => endGroupCall());
      api.addListener('videoConferenceLeft', () => endGroupCall(false));
    } catch (err) {
      console.error('[group-call]', err);
      els.groupCallLoading.innerHTML = '<strong>Gömülü grup araması açılamadı.</strong><span>“Aç” butonuna basıp ayrı sekmede devam et.</span>';
      toast('Grup araması için Aç butonunu kullan.');
    }
  }

  function openGroupCallExternal(){
    const url = groupCallUrl();
    if (!url || url.endsWith('/usms')) return toast('Önce grup aramasını başlat.');
    window.open(url, '_blank', 'noopener,noreferrer');
    toast('Grup araması ayrı sekmede açıldı.');
  }

  function minimizeGroupCall(){
    if (!state.groupCall.active) return;
    els.groupCallView.classList.add('minimized');
    els.groupCallView.classList.remove('hidden');
    state.groupCall.minimized = true;
    document.body.classList.add('group-call-minimized-active');
    toast('Grup araması küçük pencereye alındı.');
  }

  function restoreGroupCall(){
    if (!state.groupCall.active) return;
    els.groupCallView.classList.remove('minimized');
    state.groupCall.minimized = false;
    document.body.classList.remove('group-call-minimized-active');
  }

  function endGroupCall(dispose=true){
    try {
      if (dispose !== false) state.groupCall.api?.dispose?.();
    } catch {}
    state.groupCall = { api:null, active:false, minimized:false, roomName:'', url:'' };
    els.jitsiContainer.innerHTML = '';
    els.groupCallLoading.innerHTML = '<strong>Grup araması hazırlanıyor...</strong><span>Çalışmazsa “Aç” butonuyla güvenli şekilde ayrı sekmede aç.</span>';
    els.groupCallLoading.classList.remove('hidden');
    els.groupCallView.classList.remove('minimized');
    els.groupCallView.classList.add('hidden');
    document.body.classList.remove('group-call-minimized-active');
  }

  async function copyGroupCallInvite(){
    if (!state.groupCall.roomName) {
      state.groupCall.roomName = await groupCallRoomName();
      state.groupCall.url = `https://${jitsiDomain()}/${state.groupCall.roomName}`;
    }

    const link = buildInviteUrl('group');
    const text=`USMS grup araması daveti\n5-10 kişilik aramaya katıl:\n${link}\n\nDirekt arama linki:\n${state.groupCall.url}\n\nOda: ${state.me.room}\nParola: ${state.me.password}`;
    if (navigator.share) {
      navigator.share({ title:'USMS Grup Araması', text, url:link }).catch(()=>{});
    }
    navigator.clipboard.writeText(text).then(()=>toast('Grup arama daveti kopyalandı.')).catch(()=>toast(text,8000));
  }

  function encodeInviteValue(value){
    try { return btoa(unescape(encodeURIComponent(String(value || '')))); }
    catch { return btoa(String(value || '')); }
  }
  function decodeInviteValue(value){
    try { return decodeURIComponent(escape(atob(String(value || '')))); }
    catch { try { return atob(String(value || '')); } catch { return ''; } }
  }
  function buildInviteUrl(callMode=false){
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('room', state.me.room || els.roomInput.value.trim());
    url.searchParams.set('p', encodeInviteValue(state.me.password || els.passwordInput.value));
    if (callMode === 'group') url.searchParams.set('group', '1');
    else if (callMode) url.searchParams.set('call', '1');
    return url.toString();
  }
  function copyInvite(){
    const link = buildInviteUrl(false);
    const text=`USMS davet\nSite: ${location.origin}\nGörünen ad: ${showName()}\nOda: ${state.me.room}\nParola: ${state.me.password}\nHızlı giriş linki: ${link}`;
    if (navigator.share) {
      navigator.share({ title:'USMS Davet', text, url:link }).catch(()=>{});
    }
    navigator.clipboard.writeText(text).then(()=>toast('Davet bilgisi kopyalandı.')).catch(()=>toast(text,8000));
  }
  function copyCallInvite(){
    const link = buildInviteUrl(true);
    const text=`USMS arama daveti\nLinke tıkla ve odaya katıl:\n${link}\n\nOda: ${state.me.room}\nParola: ${state.me.password}`;
    if (navigator.share) {
      navigator.share({ title:'USMS Arama Daveti', text, url:link }).catch(()=>{});
    }
    navigator.clipboard.writeText(text).then(()=>toast('Arama davet linki kopyalandı.')).catch(()=>toast(text,8000));
  }
  function applyInviteFromUrl(){
    const params = new URLSearchParams(location.search);
    const room = params.get('room') || params.get('r');
    const pass = params.get('p') ? decodeInviteValue(params.get('p')) : (params.get('pass') || params.get('password') || '');
    const name = params.get('name') || params.get('n');

    if (room) els.roomInput.value = room;
    if (pass) els.passwordInput.value = pass;
    if (name && !els.nameInput.value) els.nameInput.value = name;
    if (room && pass) {
      state.invite.autoJoin = true;
      state.invite.call = params.get('call') === '1';
      state.invite.groupCall = params.get('group') === '1';
      if (!els.nameInput.value) els.nameInput.value = `Misafir-${Math.floor(1000 + Math.random()*9000)}`;
      setTimeout(() => join(), 350);
      history.replaceState(null, '', location.pathname);
    }
  }
  async function showSecurity(){ const num=await sha256Hex(`SEC|${state.me.room}|${state.me.password}`); els.securityNumber.textContent=num.match(/.{1,4}/g).join(' '); els.securityModal.classList.remove('hidden'); }
  function notify(title, body){ if('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title,{body,icon:'/assets/icons/icon-192.png'}); }
  async function requestNotifications(){ if(!('Notification' in window)) return toast('Tarayıcı bildirim desteklemiyor.'); const p=await Notification.requestPermission(); toast(p==='granted'?'Bildirim izni verildi.':'Bildirim izni verilmedi.'); }

  function playSound(kind){
    if(state.settings.sound === 'silent') return;
    const ctx = state.audioCtx || (state.audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    const base = state.settings.sound === 'glass' ? 920 : state.settings.sound === 'pop' ? 520 : 740;
    const seq = kind === 'sent' ? [base+180] : kind === 'call' ? [base, base+160, base+320] : [base, base+260];
    let t = ctx.currentTime;
    seq.forEach((freq,i)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type= state.settings.sound === 'glass' ? 'sine' : 'triangle'; o.frequency.value=freq; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.06,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+0.18); t += .12; });
  }

  async function startCall(video){
    const target = state.selectedPeerId || state.peers.keys().next().value;
    if(!target) return toast('Arama için odada başka kişi olmalı.');

    state.selectedPeerId = target;
    const profile = state.peers.get(target);
    state.call.targetId = target;
    state.call.targetProfile = profile;
    state.call.video = Boolean(video);

    try {
      showCall(profile?.name || 'Arama');

      // En stabil WebRTC akışı:
      // 1) Önce medya açılır
      // 2) Sonra peer connection kurulur
      // 3) Track'ler tek tek ve sıralı eklenir
      // 4) Offer oluşturulur
      await getLocalMedia(Boolean(video));
      await preparePeerConnection();
      attachTracksSimple();

      const offer = await state.call.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: Boolean(video)
      });

      await state.call.pc.setLocalDescription(offer);

      sendWs('signal', {
        to: target,
        signal: {
          kind: 'offer',
          sdp: offer,
          video: Boolean(video),
          callId: crypto.randomUUID()
        }
      });

      ensureVideoPlayback();
      verifyLocalMedia(Boolean(video));
    } catch(e) {
      console.error('[call-start]', e);
      toast(video ? 'Görüntülü arama başlatılamadı. Kamera iznini kontrol et.' : 'Sesli arama başlatılamadı. Mikrofon iznini kontrol et.');
      endCall(false);
    }
  }

  async function preparePeerConnection(){
    const pc = new RTCPeerConnection({
      iceServers: state.config.iceServers || [],
      iceCandidatePoolSize: 10
    });

    state.call.pc = pc;
    state.call.remoteStream = new MediaStream();

    els.remoteVideo.srcObject = state.call.remoteStream;
    if (els.remoteAudio) els.remoteAudio.srcObject = state.call.remoteStream;

    pc.onicecandidate = (e) => {
      if (e.candidate && state.call.targetId) {
        sendWs('signal', {
          to: state.call.targetId,
          signal: { kind: 'candidate', candidate: e.candidate }
        });
      }
    };

    pc.ontrack = (e) => {
      const tracks = e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track].filter(Boolean);

      for (const track of tracks) {
        if (!state.call.remoteStream.getTracks().some((t) => t.id === track.id)) {
          state.call.remoteStream.addTrack(track);
        }
      }

      els.remoteVideo.srcObject = state.call.remoteStream;
      if (els.remoteAudio) els.remoteAudio.srcObject = state.call.remoteStream;

      ensureVideoPlayback();

      const hasRemoteVideo = state.call.remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
      const hasRemoteAudio = state.call.remoteStream.getAudioTracks().some((t) => t.readyState === 'live');
      if (hasRemoteVideo || hasRemoteAudio) {
        els.callState.textContent = '';
        els.callState.classList.add('hidden');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce?.();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        els.callState.textContent = '';
        els.callState.classList.add('hidden');
        ensureVideoPlayback();
      }

      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        els.callState.textContent = 'Bağlantı yenileniyor...';
        els.callState.classList.remove('hidden');
        pc.restartIce?.();
      }
    };
  }

  async function getLocalMedia(video){
    const audio = { echoCancellation:true, noiseSuppression:true, autoGainControl:true };

    if (!video) {
      state.call.localStream = await navigator.mediaDevices.getUserMedia({ audio, video:false });
      els.localVideo.srcObject = state.call.localStream;
      updateLocalVideoMirror();
      return;
    }

    // Kamera sorunlarının çoğu fazla sıkı kalite constraint'lerinden geliyor.
    // Bu yüzden önce en uyumlu kamera açılır, sonra kalite yükseltme denenir.
    const attempts = [
      { audio, video: true },
      { audio, video: { facingMode: { ideal: state.call.facingMode || 'user' } } },
      { audio, video: { width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:{ ideal: state.call.facingMode || 'user' } } },
      { audio, video: { width:{ ideal:640 }, height:{ ideal:360 } } }
    ];

    let lastError = null;

    for (const constraints of attempts) {
      try {
        state.call.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        els.localVideo.srcObject = state.call.localStream;
        updateLocalVideoMirror();
        await els.localVideo.play().catch(()=>{});
        await upgradeLocalVideoQuality().catch(()=>{});
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Kamera açılamadı');
  }

  function attachTracksSimple(){
    const pc = state.call.pc;
    const stream = state.call.localStream;
    if (!pc || !stream) throw new Error('Medya bağlantısı hazır değil');

    // Track sırası önemli: iki tarafta da önce audio, sonra video.
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    for (const track of audioTracks) {
      pc.addTrack(track, stream);
    }

    if (state.call.video) {
      if (!videoTracks.length) throw new Error('Kamera video track üretmedi');
      for (const track of videoTracks) {
        pc.addTrack(track, stream);
      }
    }
  }

  async function upgradeLocalVideoQuality(){
    const track = state.call.localStream?.getVideoTracks?.()[0];
    if (!track) return;

    const q = els.qualitySelect.value || state.settings.quality || 'hd';
    const map = {
      fhd: { w:1920, h:1080, f:30 },
      hd: { w:1280, h:720, f:30 },
      eco: { w:640, h:360, f:24 }
    }[q] || { w:1280, h:720, f:30 };

    await track.applyConstraints({
      width: { ideal: map.w },
      height: { ideal: map.h },
      frameRate: { ideal: map.f, max: 30 }
    });
  }

  function mediaVideoConstraints(forceQuality){
    const q = forceQuality || els.qualitySelect.value || state.settings.quality || 'hd';
    const map = {
      fhd:{w:1920,h:1080,f:30},
      hd:{w:1280,h:720,f:30},
      eco:{w:640,h:360,f:24}
    }[q] || {w:1280,h:720,f:30};

    return {
      width:{ideal:map.w},
      height:{ideal:map.h},
      frameRate:{ideal:map.f,max:30},
      facingMode:{ideal:state.call.facingMode || 'user'}
    };
  }

  function minimizeCall(){
    if (!state.call.active) return;
    els.callView.classList.add('minimized');
    els.callView.classList.remove('hidden');
    document.body.classList.add('call-minimized-active');
    toast('Arama küçük pencereye alındı. Sohbette yazmaya devam edebilirsin.');
    ensureVideoPlayback();
  }

  function restoreCall(){
    if (!state.call.active) return;
    els.callView.classList.remove('minimized');
    document.body.classList.remove('call-minimized-active');
    ensureVideoPlayback();
  }

  function updateLocalVideoMirror(){
    if (!els.localVideo) return;
    els.localVideo.classList.toggle('mirror', Boolean(state.settings.selfMirror));
  }

  function showCall(name){
    state.call.active = true;
    els.callName.textContent = name;
    els.callState.textContent = '';
    els.callState.classList.add('hidden');
    els.callView.classList.remove('hidden');
    els.callView.classList.remove('minimized');
    document.body.classList.remove('call-minimized-active');
    els.qualitySelect.value = state.settings.quality || 'hd';
    updateLocalVideoMirror();
    ensureVideoPlayback();
  }

  function ensureVideoPlayback(){
    try {
      // Ses için remoteAudio, görüntü için remoteVideo kullanılır.
      // Böylece mobil tarayıcılarda video autoplay yüzünden ses/görüntü kilitlenmez.
      els.remoteVideo.muted = true;
      els.remoteVideo.playsInline = true;
      els.localVideo.playsInline = true;

      if (els.remoteAudio) {
        els.remoteAudio.muted = false;
        els.remoteAudio.play?.().catch(()=>{});
      }

      els.remoteVideo.play().catch(()=>{});
      els.localVideo.play().catch(()=>{});
    } catch {}
  }

  function verifyLocalMedia(wantsVideo){
    setTimeout(() => {
      const audioOk = Boolean(state.call.localStream?.getAudioTracks?.().some((t) => t.readyState === 'live' && t.enabled));
      const videoOk = Boolean(state.call.localStream?.getVideoTracks?.().some((t) => t.readyState === 'live' && t.enabled));

      if (!audioOk) toast('Mikrofon alınamadı. Tarayıcı mikrofon iznini kontrol et.');
      if (wantsVideo && !videoOk) toast('Kamera alınamadı. Tarayıcı kamera iznini kontrol et.');
    }, 1200);
  }

  async function handleSignal(msg){
    const s = msg.signal || {};

    if (s.kind === 'offer') return incomingOffer(msg.from, msg.fromProfile, s);

    if (s.kind === 'answer') {
      if (!state.call.pc) return;
      await state.call.pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
      flushCandidates();
      ensureVideoPlayback();
      return;
    }

    if (s.kind === 'candidate') return addIceCandidate(s.candidate);
    if (s.kind === 'hangup') return endCall(false);
  }

  function incomingOffer(from, profile, signal){
    state.call.incoming = { from, profile, signal };
    els.incomingTitle.textContent = `${profile?.name || 'Kullanıcı'} arıyor`;
    els.incomingText.textContent = signal.video ? 'Görüntülü arama' : 'Sesli arama';
    els.incomingAvatar.textContent = initials(profile?.name || 'AR');
    els.incomingModal.classList.remove('hidden');
    playSound('call');
  }

  async function acceptIncoming(){
    const inc = state.call.incoming;
    if(!inc) return;

    els.incomingModal.classList.add('hidden');
    state.call.targetId = inc.from;
    state.call.targetProfile = inc.profile;
    state.call.video = Boolean(inc.signal.video);

    try {
      showCall(inc.profile?.name || 'Arama');

      await getLocalMedia(Boolean(inc.signal.video));
      await preparePeerConnection();
      attachTracksSimple();

      await state.call.pc.setRemoteDescription(new RTCSessionDescription(inc.signal.sdp));
      flushCandidates();

      const answer = await state.call.pc.createAnswer();
      await state.call.pc.setLocalDescription(answer);

      sendWs('signal', {
        to: inc.from,
        signal: { kind:'answer', sdp: answer }
      });

      ensureVideoPlayback();
      verifyLocalMedia(Boolean(inc.signal.video));
    } catch(e) {
      console.error('[call-accept]', e);
      toast('Arama kabul edilemedi. Kamera/mikrofon iznini kontrol et.');
      endCall(true);
    }
  }

  function rejectIncoming(){ const inc=state.call.incoming; if(inc) sendWs('signal',{to:inc.from,signal:{kind:'hangup'}}); state.call.incoming=null; els.incomingModal.classList.add('hidden'); }
  async function addIceCandidate(c){ if(!c) return; if(state.call.pc?.remoteDescription) { try{ await state.call.pc.addIceCandidate(new RTCIceCandidate(c)); }catch(e){ console.warn(e); } } else state.call.candidateQueue.push(c); }
  function flushCandidates(){ const q=[...state.call.candidateQueue]; state.call.candidateQueue=[]; q.forEach(c=>addIceCandidate(c)); }
  function endCall(notifyPeer){ if(notifyPeer && state.call.targetId) sendWs('signal',{to:state.call.targetId,signal:{kind:'hangup'}}); try{state.call.pc?.close();}catch{} state.call.localStream?.getTracks().forEach(t=>t.stop()); state.call={ pc:null, localStream:null, remoteStream:null, targetId:null, targetProfile:null, active:false, incoming:null, video:false, muted:false, cameraOff:false, facingMode:state.call.facingMode||'user', candidateQueue:[], fit:'contain' }; els.remoteVideo.srcObject=null; if(els.remoteAudio) els.remoteAudio.srcObject=null; els.localVideo.classList.remove('mirror'); els.localVideo.srcObject=null; els.callView.classList.remove('minimized'); document.body.classList.remove('call-minimized-active'); els.callView.classList.add('hidden'); }
  function toggleMute(){ state.call.muted=!state.call.muted; state.call.localStream?.getAudioTracks().forEach(t=>t.enabled=!state.call.muted); els.muteBtn.classList.toggle('off',state.call.muted); }
  function toggleCamera(){ state.call.cameraOff=!state.call.cameraOff; state.call.localStream?.getVideoTracks().forEach(t=>t.enabled=!state.call.cameraOff); els.cameraBtn.classList.toggle('off',state.call.cameraOff); }
  async function switchCamera(){
    if(!state.call.active || !state.call.video) return;

    state.call.facingMode = state.call.facingMode === 'user' ? 'environment' : 'user';

    try {
      const attempts = [
        { audio:false, video:{ facingMode:{ exact: state.call.facingMode } } },
        { audio:false, video:{ facingMode:{ ideal: state.call.facingMode } } },
        { audio:false, video:true }
      ];

      let stream = null;
      let lastError = null;

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) throw lastError || new Error('Kamera değiştirilemedi');

      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack) throw new Error('Yeni kamera video track vermedi');

      const sender = state.call.pc?.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);

      const oldTracks = state.call.localStream?.getVideoTracks() || [];
      oldTracks.forEach((t) => {
        try { state.call.localStream.removeTrack(t); } catch {}
        t.stop();
      });

      state.call.localStream.addTrack(newTrack);
      els.localVideo.srcObject = state.call.localStream;
      updateLocalVideoMirror();
      await els.localVideo.play().catch(()=>{});
      await upgradeLocalVideoQuality().catch(()=>{});
    } catch(e) {
      console.error('[switch-camera]', e);
      toast('Bu cihazda diğer kamera açılamadı.');
    }
  }

  async function applyCallQuality(q){
    if(!state.call.active || !state.call.video) return;
    const track = state.call.localStream?.getVideoTracks()[0];
    if(track) await track.applyConstraints(mediaVideoConstraints(q)).catch(()=>toast('Bu cihaz seçilen kaliteyi desteklemiyor.'));
  }
  function setCallEffect(v){ els.callView.classList.remove('effect-none','effect-cinematic','effect-soft','effect-mono','effect-vivid'); els.callView.classList.add(`effect-${v}`); }
  function toggleFit(){ state.call.fit=state.call.fit==='contain'?'cover':'contain'; els.callView.classList.toggle('fit-contain',state.call.fit==='contain'); els.callView.classList.toggle('fit-cover',state.call.fit==='cover'); }
  async function snapshotCall(){ const video=els.remoteVideo.videoWidth?els.remoteVideo:els.localVideo; if(!video.videoWidth) return toast('Görüntü hazır değil.'); const c=document.createElement('canvas'); c.width=video.videoWidth; c.height=video.videoHeight; c.getContext('2d').drawImage(video,0,0); const data=c.toDataURL('image/jpeg',.9); await sendEncryptedMessage({type:'attachment',attachment:{name:'arama-fotografi.jpg',type:'image/jpeg',size:Math.round(data.length*0.75),data}},'snapshot'); toast('Arama fotoğrafı sohbete gönderildi.'); }

  
  async function startPrivateChat(){
    const p = state.selectedPeerId ? state.peers.get(state.selectedPeerId) : null;
    if(!p) return toast('Özel sohbet için önce kişiyi seç.');
    const own = state.profile.profileId || state.profile.username || state.profile.name;
    const other = p.profileId || p.username || p.name;
    if(!own || !other) return toast('Kişi bilgisi eksik.');

    const ids = [String(own), String(other)].sort();
    const roomHash = await sha256Hex('USMS-DM-ROOM|' + ids.join('|'));
    const passHash = await sha256Hex('USMS-DM-PASS|' + ids.join('|'));

    state.me.room = 'dm-' + roomHash.slice(0, 28);
    state.me.password = passHash.slice(0, 40);
    els.roomInput.value = state.me.room;
    els.passwordInput.value = state.me.password;
    state.pendingPrivateTitle = `Özel · ${p.name || p.username || 'Kişi'}`;

    els.infoPanel.classList.remove('open');
    toast('Özel sohbet açılıyor...');
    await join();
  }

  function openContactsModal(){ renderContacts(); els.contactsModal.classList.remove('hidden'); setTimeout(()=>els.contactUsernameInput?.focus(),80); }
  function renderContacts(){
    if(!els.contactsList) return;
    const contacts = Object.values(state.contacts || {});
    els.contactsList.innerHTML = '';
    if(!contacts.length){ els.contactsList.innerHTML='<div class="empty-small">Henüz kişi eklenmedi. @kullanıcıadı ile ekle.</div>'; return; }
    for(const c of contacts){
      const online = [...state.peers.values()].find(p => p.profileId === c.profileId || (p.username && p.username === c.username));
      const el=document.createElement('button');
      el.className='contact-item';
      el.onclick=()=>{ if(online){ state.selectedPeerId=online.peerId; openInfoPanel(online); els.contactsModal.classList.add('hidden'); } else toast('Bu kişi şu an odada çevrimiçi değil.'); };
      el.innerHTML=`<div class="contact-avatar">${c.avatar?`<img src="${c.avatar}" alt="">`:escapeHtml(initials(c.name))}</div><div><strong>${escapeHtml(c.name||'Kullanıcı')}</strong><span>${escapeHtml(c.username?'@'+c.username:'kullanıcı adı yok')} · ${online?'çevrimiçi':'çevrimdışı'}</span></div><small>${online?'›':'·'}</small>`;
      els.contactsList.appendChild(el);
    }
  }
  function addContactByUsername(){
    const rawUser = String(els.contactUsernameInput?.value || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '').slice(0,32);
    const u = rawUser;
    if(!u) return toast('Kullanıcı adı yaz.');
    const all=[...Object.values(state.profiles||{}), ...state.peers.values()];
    const found=all.find(p => normalizeUsername(p.username || '') === u);
    if(!found) return toast('Bu kullanıcı bu odada bulunamadı. Önce aynı odaya girmiş olmalı.');
    state.contacts[found.profileId || u] = { profileId: found.profileId || u, username: u, name: found.name || u, avatar: found.avatar || '', phone: found.phone || '', email: found.email || '', bio: found.bio || '' };
    saveJson(STORE_CONTACTS,state.contacts);
    els.contactUsernameInput.value='';
    renderContacts();
    toast('@'+u+' kişilere eklendi.');
  }
  function openRoomSettings(){
    els.mainMenuModal?.classList.add('hidden');
    els.roomDisplayNameInput.value=state.roomMeta?.title || state.me.room || '';
    els.roomDescriptionInput.value=state.roomMeta?.description || '';
    renderRoomAvatarPreview();
    els.roomSettingsModal.classList.remove('hidden');
  }
  function renderRoomAvatarPreview(){
    if(!els.roomAvatarPreview || !els.roomAvatarText) return;
    if(state.roomMeta?.avatar){ els.roomAvatarPreview.src=state.roomMeta.avatar; els.roomAvatarBtn.classList.add('room-has-img'); }
    else { els.roomAvatarPreview.removeAttribute('src'); els.roomAvatarBtn.classList.remove('room-has-img'); els.roomAvatarText.textContent='US'; }
  }
  function handleRoomAvatarFile(file){
    if(!file) return;
    if(!file.type.startsWith('image/')) return toast('Sadece resim yükleyebilirsin.');
    const reader=new FileReader();
    reader.onload=async()=>{ state.roomMeta.avatar=await resizeImage(reader.result,420,.84); renderRoomAvatarPreview(); };
    reader.readAsDataURL(file);
  }
  function saveRoomSettings(){
    state.roomMeta = {
      title: els.roomDisplayNameInput.value.trim() || state.me.room,
      description: els.roomDescriptionInput.value.trim(),
      avatar: state.roomMeta?.avatar || '',
      updatedAt: Date.now()
    };
    renderRoomMeta();
    sendWs('room-meta-update',{roomMeta:state.roomMeta});
    els.roomSettingsModal.classList.add('hidden');
    toast('Oda profili güncellendi.');
  }

  function openInfoPanel(profile=null){ const p=profile || (state.selectedPeerId ? state.peers.get(state.selectedPeerId) : null) || {name:state.me.room,bio:'Güvenli oda',email:'—',phone:'—',status:'aktif'}; state.selectedProfileId=p.profileId || 'room'; els.selectedName.textContent=p.name||state.me.room; els.selectedBio.textContent=p.bio||'—'; els.selectedEmail.textContent=p.email||'—'; els.selectedPhone.textContent=p.phone||'—'; els.selectedStatus.textContent=p.status||'çevrimiçi'; const img=els.selectedAvatar.querySelector('img'); const span=els.selectedAvatar.querySelector('span'); if(p.avatar){ img.src=p.avatar; els.selectedAvatar.classList.add('has-img'); } else { img.removeAttribute('src'); els.selectedAvatar.classList.remove('has-img'); span.textContent=initials(p.name||'US'); } els.peerNoteInput.value=state.peerNotes[state.selectedProfileId]||''; els.infoPanel.classList.add('open'); }
  function savePeerNote(){ if(!state.selectedProfileId) return; state.peerNotes[state.selectedProfileId]=els.peerNoteInput.value; saveJson(STORE_NOTES,state.peerNotes); toast('Not kaydedildi.'); }
  function openProfileModal(){ els.profileNameInput.value=state.profile.name||''; if(els.profileUsernameInput) els.profileUsernameInput.value=state.profile.username ? '@'+state.profile.username : ''; els.profileEmailInput.value=state.profile.email||''; els.profilePhoneInput.value=state.profile.phone||''; els.profileBioInput.value=state.profile.bio||''; renderAvatarPreviews(); els.profileModal.classList.remove('hidden'); }
  function saveProfileFromModal(){ state.profile.name=els.profileNameInput.value.trim()||state.profile.name; state.profile.username=normalizeUsername(els.profileUsernameInput?.value || state.profile.username || state.profile.name); state.profile.email=els.profileEmailInput.value.trim(); state.profile.phone=els.profilePhoneInput.value.trim(); state.profile.bio=els.profileBioInput.value.trim(); state.profile.status=state.profile.bio||'çevrimiçi'; saveJson(STORE_PROFILE,state.profile); renderAvatarPreviews(); els.myName.textContent=state.profile.name; broadcastProfile(); els.profileModal.classList.add('hidden'); toast('Profil güncellendi.'); }
  function broadcastProfile(){ if(state.joined) sendWs('profile-update',{profile:state.profile}); }

  function switchSettingsTab(tab){
    document.querySelectorAll('.settings-tab').forEach((b)=>b.classList.toggle('active', b.dataset.settingsTab === tab));
    document.querySelectorAll('.settings-page').forEach((p)=>p.classList.toggle('active', p.dataset.settingsPage === tab));
  }

  function setupSettingsLivePreview(){
    const ids = ['themeSelect','wallpaperSelect','bubbleSelect','fontSelect','selfViewMirrorSelect'];
    ids.forEach((id)=>{
      const el = els[id];
      if(el && !el.dataset.liveBound){
        el.dataset.liveBound = '1';
        el.addEventListener('change', ()=>previewSettingsFromModal());
      }
    });
  }

  function getSettingsFromModal(){
    return {
      ...state.settings,
      theme: els.themeSelect?.value || state.settings.theme || 'aurora',
      wallpaper: els.wallpaperSelect?.value || state.settings.wallpaper || 'pro-midnight',
      bubble: els.bubbleSelect?.value || state.settings.bubble || 'modern',
      font: els.fontSelect?.value || state.settings.font || 'normal',
      sound: els.soundSelect?.value || state.settings.sound || 'prism',
      quality: els.defaultQualitySelect?.value || state.settings.quality || 'hd',
      secretMode: els.secretModeToggle?.value === 'on',
      expire: els.expireSelect?.value || 'never',
      selfMirror: els.selfViewMirrorSelect?.value === 'on',
      enterSend: els.enterSendSelect?.value !== 'off',
      rememberAccount: els.rememberAccountSelect?.value !== 'off'
    };
  }

  function openSettingsModal(){
    els.themeSelect.value = state.settings.theme || 'aurora';
    els.wallpaperSelect.value = state.settings.wallpaper || 'pro-midnight';
    els.bubbleSelect.value = state.settings.bubble || 'modern';
    els.fontSelect.value = state.settings.font || 'normal';
    els.soundSelect.value = state.settings.sound || 'prism';
    els.defaultQualitySelect.value = state.settings.quality || 'hd';
    if(els.secretModeToggle) els.secretModeToggle.value = state.settings.secretMode ? 'on' : 'off';
    if(els.expireSelect) els.expireSelect.value = state.settings.expire || 'never';
    if(els.selfViewMirrorSelect) els.selfViewMirrorSelect.value = state.settings.selfMirror ? 'on' : 'off';
    if(els.enterSendSelect) els.enterSendSelect.value = state.settings.enterSend === false ? 'off' : 'on';
    if(els.rememberAccountSelect) els.rememberAccountSelect.value = state.settings.rememberAccount === false ? 'off' : 'on';
    if(els.jitsiInfoInput) els.jitsiInfoInput.value = state.config.jitsiDomain || 'meet.hawarserver.com';
    setupSettingsLivePreview();
    switchSettingsTab('appearance');
    els.settingsModal.classList.remove('hidden');
  }

  function previewSettingsFromModal(){
    const preview = getSettingsFromModal();
    applySettings(preview);
    const oldMirror = state.settings.selfMirror;
    state.settings.selfMirror = preview.selfMirror;
    updateLocalVideoMirror();
    state.settings.selfMirror = oldMirror;
  }

  function saveSettingsFromModal(){
    state.settings = getSettingsFromModal();
    saveJson(STORE_SETTINGS, state.settings);
    if(state.settings.rememberAccount) saveJson(STORE_PROFILE, state.profile);
    applySettings();
    updateLocalVideoMirror();
    els.settingsModal.classList.add('hidden');
    toast('Ayarlar kaydedildi ve aktif edildi.');
  }

  function applySettings(settings = state.settings){
    const keep = [...document.body.classList].filter((c)=>!c.startsWith('theme-') && !c.startsWith('wallpaper-') && !c.startsWith('bubbles-') && !c.startsWith('font-') && c !== 'self-mirror-enabled');
    document.body.className = keep.join(' ');
    document.body.classList.add(`theme-${settings.theme || 'aurora'}`);
    document.body.classList.add(`wallpaper-${settings.wallpaper || 'pro-midnight'}`);
    document.body.classList.add(`bubbles-${settings.bubble || 'modern'}`);
    document.body.classList.add(`font-${settings.font || 'normal'}`);
    if(settings.selfMirror) document.body.classList.add('self-mirror-enabled');
  }
})();
