#!/usr/bin/env bash
set -euo pipefail

APP_NAME="USMS"
BUNDLE_ID="com.hawar.usms"

if [ ! -d "ios" ]; then
  npx cap add ios
fi

npx cap sync ios

PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${APP_NAME}" "$PLIST" || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string ${APP_NAME}" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription USMS görüntülü arama, fotoğraf çekme ve profil fotoğrafı için kamerayı kullanır." "$PLIST" || /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string USMS görüntülü arama, fotoğraf çekme ve profil fotoğrafı için kamerayı kullanır." "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSMicrophoneUsageDescription USMS sesli arama, görüntülü arama ve sesli mesaj için mikrofonu kullanır." "$PLIST" || /usr/libexec/PlistBuddy -c "Add :NSMicrophoneUsageDescription string USMS sesli arama, görüntülü arama ve sesli mesaj için mikrofonu kullanır." "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription USMS sohbet içinde fotoğraf ve video seçebilmen için fotoğraf arşivine erişir." "$PLIST" || /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string USMS sohbet içinde fotoğraf ve video seçebilmen için fotoğraf arşivine erişir." "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryAddUsageDescription USMS kaydetmek istediğin medya dosyalarını fotoğraf arşivine ekleyebilir." "$PLIST" || /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryAddUsageDescription string USMS kaydetmek istediğin medya dosyalarını fotoğraf arşivine ekleyebilir." "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST" || /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST"
fi

if [ -d "ios/App" ]; then
  echo "iOS project prepared."
fi
