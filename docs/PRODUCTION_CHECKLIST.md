# Production Checklist — Akutansia

Checklist ini wajib dicek sebelum Akutansia dipublikasikan sebagai production release.

## 1. Environment

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` sudah generated dan disimpan aman.
- [ ] `APP_URL` memakai domain final `https://...`.
- [ ] Timezone aplikasi dan tenant default sesuai kebutuhan bisnis.
- [ ] `.env` tidak masuk git dan hanya bisa dibaca user aplikasi.

## 2. Database

- [ ] Production memakai PostgreSQL, bukan SQLite.
- [ ] User database punya privilege minimum yang dibutuhkan aplikasi.
- [ ] Migration sudah dijalankan: `php artisan migrate --force`.
- [ ] Backup otomatis aktif minimal harian.
- [ ] Restore backup sudah pernah diuji.
- [ ] Retention backup ditentukan sesuai kebutuhan bisnis.

## 3. Cache, Session, Queue

- [ ] Redis tersedia dan dikonfigurasi untuk cache/queue/session bila dipakai.
- [ ] `CACHE_STORE` production bukan `array`.
- [ ] `QUEUE_CONNECTION` production tidak memakai `sync` untuk job penting.
- [ ] Queue worker berjalan via Supervisor/systemd/container process manager.
- [ ] Scheduler berjalan tiap menit: `php artisan schedule:run`.

## 4. Mail & Notification

- [ ] SMTP/mail provider production sudah valid.
- [ ] `MAIL_FROM_ADDRESS` dan `MAIL_FROM_NAME` benar.
- [ ] Trial/subscription/invitation reminder sudah punya jalur pengiriman atau minimal runbook manual.

## 5. Storage & Public Assets

- [ ] `php artisan storage:link` sudah dijalankan bila memakai public storage.
- [ ] Permission `storage/` dan `bootstrap/cache/` bisa ditulis oleh user aplikasi.
- [ ] `npm run build` berhasil dan `public/build/manifest.json` tersedia.
- [ ] Web server mengarah ke folder `public/`.

## 6. Security Hardening

- [ ] HTTPS aktif dan redirect HTTP ke HTTPS.
- [ ] Cookie/session secure sesuai domain production.
- [ ] Platform admin hanya untuk user terpercaya.
- [ ] `APP_DEBUG=false` terverifikasi dari browser.
- [ ] Dependency audit bersih untuk high/critical vulnerabilities.
- [ ] Rate limiting/login protection dievaluasi untuk traffic production.

## 7. Observability

- [ ] Log Laravel dikirim ke lokasi yang dipantau.
- [ ] Retention log ditetapkan.
- [ ] Error tracking/alerting tersedia atau ada runbook manual.
- [ ] Uptime check memantau `/health` atau `/up`.
- [ ] Queue failure dimonitor.

## 8. Validation Gate

Jalankan dan simpan hasilnya di progress log release:

```bash
./vendor/bin/pint --test
php artisan test
npm run build
npm audit --audit-level=high --omit=dev
php .tools/composer.phar audit
php artisan migrate:status
php artisan app:smoke-check --require-build
```

## 9. Release & Rollback

- [ ] Git repo bersih dan commit baseline tersedia.
- [ ] `CHANGELOG.md` diperbarui.
- [ ] Tag release dibuat, contoh: `v0.1.0-rc1`.
- [ ] Backup database dibuat sebelum deploy.
- [ ] Rollback plan ditulis: tag sebelumnya, backup database, dan langkah clear cache.
