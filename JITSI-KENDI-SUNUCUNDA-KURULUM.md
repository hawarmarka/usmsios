# Kendi Sunucunda Grup Araması

Bu uygulamada 1'e 1 arama kendi USMS/TURN yapınla çalışır.

5-10 kişilik gerçek grup araması için ayrı bir medya sunucusu gerekir. Bu sürümde grup araması Jitsi SFU ile çalışır. Dışarıdaki meet.jit.si yerine kendi sunucunu kullanmak için:

## 1. DNS

Cloudflare / DNS tarafında:

```text
meet.hawarserver.com  A  185.246.113.154
```

Proxy kapalı / DNS only olması daha sağlıklı olabilir. Özellikle UDP medya trafiği Cloudflare proxy üzerinden geçmez.

## 2. Coolify'da Jitsi kur

Coolify'da ayrı bir Docker Compose resource olarak Jitsi Meet kurmalısın. Resmi yöntem `docker-jitsi-meet` projesidir.

Açılması gereken en önemli portlar:

```text
80/tcp
443/tcp
10000/udp
```

10000/udp grup görüşmelerindeki medya için önemlidir.

## 3. USMS Environment Variables

USMS uygulamasında:

```env
JITSI_DOMAIN=meet.hawarserver.com
```

olmalı.

## 4. Redeploy

Hem Jitsi servisi çalışmalı hem de USMS uygulaması redeploy edilmelidir.

Not: Jitsi servisini kurmadan `JITSI_DOMAIN=meet.hawarserver.com` yaparsan grup araması açılmaz. Önce meet.hawarserver.com üzerinde Jitsi çalışmalı.
