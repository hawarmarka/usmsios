# USMS Enterprise Mobile v7

Profesyonel mobil-first şifreli mesajlaşma uygulaması.

## Öne çıkanlar

- Telegram tarzı sade giriş ekranı
- Tamamen özgün profesyonel ikon seti
- Gece mavisi premium mobil arayüz
- Profil fotoğrafı, kullanıcı adı, e-posta, telefon, durum
- Kullanıcı adından kişi ekleme
- Oda profil resmi, görünen oda adı, oda açıklaması
- Davet bilgisi paylaşma
- Kalıcı şifreli oda geçmişi
- Mesaj, dosya, fotoğraf, kamera ile fotoğraf
- Sesli mesaj ve video mesaj
- Mesaj cevaplama, düzenleme, silme, sabitleme, kopyalama altyapısı
- Durum paylaşma
- Tema, sohbet arka planı, balon, yazı ve bildirim ayarları
- Medya galerisi altyapısı
- Sesli/görüntülü arama
- TURN destekli WebRTC
- Full HD kamera ideal ayarı ve kalite fallback
- Remote audio hotfix: audio element + video element birlikte kullanılır
- Ön/arka kamera değiştirme
- Görüntü sığdır/doldur, görüntü efekti, snapshot
- PWA / telefona yüklenebilir yapı

## Coolify

Build Pack: Dockerfile  
Base Directory: /  
Dockerfile Location: /Dockerfile  
Port: 3000

Environment Variables:

```env
DATA_DIR=/app/data
MAX_PAYLOAD_BYTES=26214400
MAX_UPLOAD_BYTES=10485760
MAX_HISTORY_MESSAGES=1200
TURN_URLS=turn:turn.hawarserver.com:3478?transport=udp,turn:turn.hawarserver.com:3478?transport=tcp
TURN_USERNAME=hawar
TURN_PASSWORD=GucluTurnSifresi12345
```

Persistent Storage:

```text
Mount Path: /app/data
```

## Arama testi

Aynı cihazda iki sekme ile test etme. En doğru test:

1. PC Chrome / Edge
2. Telefon Chrome / Safari
3. Biri Wi-Fi, biri mobil internet
4. Aynı oda adı + aynı parola
5. Önce sesli, sonra görüntülü arama

`/config` içinde `turnReady:true` görünmeli.
