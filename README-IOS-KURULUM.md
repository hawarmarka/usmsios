# USMS iOS App Store Kurulum Rehberi

Bu paket Windows üzerinde hazırlanır, iOS build ise Codemagic'in bulut Mac makinesinde alınır.

## 1. Gereken hesaplar

- Apple Developer hesabı
- App Store Connect erişimi
- Codemagic hesabı
- GitHub repo

## 2. Önemli bilgiler

- Bundle ID: `com.hawar.usms`
- App Name: `USMS`
- Web App URL: `https://usms.hawarserver.com`
- Jitsi URL: `https://meet.hawarserver.com`
- Privacy Policy: `https://usms.hawarserver.com/privacy.html`
- Support URL: `https://usms.hawarserver.com/support.html`

## 3. Windows tarafında

Repo kökünde:

```bash
npm install
git add .
git commit -m "Add iOS Capacitor app"
git push
```

iOS klasörünü Windows'ta oluşturmak şart değil. Codemagic build sırasında `scripts/prepare-ios.sh` çalıştırıp iOS projesini oluşturur.

## 4. Codemagic tarafında

1. Codemagic hesabı aç.
2. GitHub reposunu bağla.
3. App Store Connect API key entegrasyonunu ekle.
4. iOS code signing için Apple Distribution certificate ve App Store provisioning profile oluştur/fetch et.
5. `codemagic.yaml` workflow'unu çalıştır.

## 5. App Store Connect

App Store Connect'te yeni uygulama oluştur:

- Platform: iOS
- Name: USMS
- Primary language: Turkish
- Bundle ID: com.hawar.usms
- SKU: usms-hawar-001
- Category: Social Networking

## 6. İzin açıklamaları

`Info.plist` build sırasında otomatik patchlenir:

- Camera: görüntülü arama/fotoğraf
- Microphone: sesli arama/sesli mesaj
- Photo Library: medya seçme
- Encryption: ITSAppUsesNonExemptEncryption=false

## 7. Build sonucu

Codemagic başarılı olursa `.ipa` dosyası üretir ve TestFlight'a gönderir.
