# USMS Enterprise Mobile v7.1

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


## v7.1 Görüntülü Arama Düzeltmesi

- Sesli arama çalışıp video gelmeme sorununa karşı WebRTC video çekirdeği değiştirildi.
- Video call artık önce kamerayı basit `video:true` mantığıyla açar, sonra kaliteyi yükseltir.
- Offer tarafında audio/video transceiver zorunlu eklenir.
- Answer tarafında önce remote offer set edilir, sonra local kamera track'i doğru sender'a bağlanır.
- Kamera Full HD desteklemezse arama bozulmaz, mevcut desteklenen kaliteyle devam eder.
- Remote video/audio otomatik oynatma tekrar güçlendirildi.


## v7.2 Ses/Görüntü Arama Stabilizasyonu

Bu sürümde arama çekirdeği tamamen sadeleştirildi:
- Karmaşık transceiver/replaceTrack ilk bağlantı akışı kaldırıldı.
- İki tarafta da track ekleme sırası sabitlendi: önce audio, sonra video.
- Kamera önce en uyumlu şekilde açılır, kalite sonra yükseltilir.
- Remote görüntü ve remote ses ayrı elemanlara bağlandı.
- Remote video sessize alındı, ses remoteAudio üzerinden oynatılır.
- Tek taraflı ses/görüntü gitmeme sorunlarını azaltmak için negotiation akışı sadeleştirildi.


## v7.3 Aramadayken Sohbete Dönme

- Arama ekranındaki geri butonu artık aramayı kapatmaz.
- Arama küçük pencereye alınır.
- Kullanıcı sohbet ekranına dönüp mesaj yazmaya devam edebilir.
- Küçük arama penceresine dokununca tam ekran aramaya geri döner.
- Arama açıkken ses/görüntü bağlantısı devam eder.


## v7.4 Arama Daveti ve Hızlandırma

- Arama ekranına "aramaya kişi ekle / link paylaş" butonu eklendi.
- Linke tıklayan kişi oda adı ve parola ile otomatik giriş yapabilir.
- Mobil paylaşım destekleniyorsa doğrudan paylaşım ekranı açılır.
- Sohbet DOM performansı için eski mesaj elemanları ekranda sınırlanır.
- Görsel/video/ses medya elemanları lazy/preload metadata ile optimize edildi.
- Büyük geçmişte arayüz kasmasını azaltmak için mesaj DOM temizliği eklendi.

Not: Bu sürüm p2p 1:1 arama çekirdeğini korur. Gerçek 3+ kişilik grup görüntülü arama için SFU mimarisi gerekir.


## v7.8 Grup Araması Düzeltmesi

- 1'e 1 arama çekirdeği v7.4 stabil sürümden korundu.
- Grup araması Jitsi ile yeniden eklendi.
- Gömülü Jitsi açılmazsa “Aç” butonu ile ayrı sekmede güvenli şekilde açılır.
- Telefonlarda iframe/Jitsi sorunları için fallback eklendi.
- Grup arama daveti hem USMS hızlı giriş linki hem de direkt Jitsi linki içerir.
- v7.7'deki agresif mobil CSS geri alınarak görüntü karışması azaltıldı.
- JITSI_DOMAIN=meet.jit.si varsayılandır; kendi Jitsi sunucun varsa bu değişkeni değiştir.


## v7.9 Kendi Jitsi Sunucun ve Kamera Ters Görüntü Düzeltmesi

- Varsayılan grup araması domaini artık `meet.hawarserver.com` olarak ayarlandı.
- Dış Jitsi yerine kendi sunucundaki Jitsi'yi kullanman için `JITSI_DOMAIN=meet.hawarserver.com` önerilir.
- Ön kamera yerel önizlemesi düzeltildi.
- Aynalama sadece kendi küçük kamera önizlemene uygulanır; karşı tarafa giden görüntüyü bozmaz.
- Kendi sunucunda grup araması için `JITSI-KENDI-SUNUCUNDA-KURULUM.md` dosyasını oku.


## v8.0 Final Profesyonel Dokunuşlar

- Giriş ekranı sadeleştirildi: İsim Soyisim, Kullanıcı Adı, Oda No, Oda Şifresi.
- Giriş ekranı profesyonel code-rain / secure tarzına çevrildi.
- E-posta, telefon, durum ve profil fotoğrafı girişten kaldırıldı; artık uygulama içinden yönetilir.
- Ayarlar tek merkezde toplandı: Tasarım, Sohbet, Arama, Gizlilik.
- Ayar sekmeleri aktif çalışır hale getirildi.
- Enter ile gönder, süreli mesaj, gizli mod, bildirim sesi, tema, yazı boyutu, arama kalitesi seçenekleri çalışır hale getirildi.
- Kendi kamera görüntüsünde ayna/ters efekt varsayılan olarak kapatıldı.
- İsteyen kullanıcı Ayarlar > Arama içinden kendi görüntüsünü ayna gibi göster seçeneğini açabilir.
- Kişiye özel sohbet için profil paneline "Özel Sohbet Aç" butonu eklendi.
- Özel sohbetler deterministik özel oda ile açılır ve sadece iki kişinin bildiği özel anahtarla devam eder.
- Hesap kayıt/giriş sistemi mevcut sunucu API ile çalışır ve kullanıcı bilgileri hatırlanır.


## v8.1 Telegram Tarzı Temiz Tasarım

- Ana sohbet ekranı Telegram benzeri temiz dark tasarıma çevrildi.
- Yapay görünen daireli/AI arka plan yerine sade güven veren arka plan eklendi.
- Giriş ekranındaki kod yağmuru harf/sayı efekti kaldırıldı.
- Giriş ekranı güven veren premium hareketli gradient stile çevrildi.
- Ayarlar canlı önizleme destekli hale getirildi.
- Tema, arka plan, balon, yazı boyutu seçenekleri görünür şekilde çalışır hale getirildi.
- `applySettings()` artık dinamik arama/mini pencere classlarını silmez.
- Kamera görüntüsü varsayılan olarak düz gösterilir; ayna efekti sadece kullanıcı ayardan açarsa uygulanır.


## v8.2 iOS App Store Hazırlığı

- Capacitor iOS wrapper eklendi.
- `capacitor.config.ts` eklendi.
- `codemagic.yaml` eklendi.
- iOS izin açıklamalarını patchleyen `scripts/prepare-ios.sh` eklendi.
- App Store için privacy/support/terms/delete-account sayfaları eklendi.
- App icon ve splash kaynakları `resources/` içine eklendi.
- Detaylı kurulum için `README-IOS-KURULUM.md` dosyasını oku.
