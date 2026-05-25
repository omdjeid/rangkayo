# Runbook Production — Akutansia

Runbook ini berisi langkah operasional minimum untuk deploy, rollback, backup, dan smoke check Akutansia.

## Deploy Baru

1. Ambil source release/tag yang akan dideploy.
2. Install dependency production:

   ```bash
   php .tools/composer.phar install --no-dev --prefer-dist --optimize-autoloader
   npm ci
   npm run build
   ```

3. Pastikan `.env` production sudah benar dan aman. Untuk Cloudflare Tunnel RangKayo, domain minimal:

   ```bash
   APP_URL=https://rangkayo.my.id
   SESSION_DOMAIN=.rangkayo.my.id
   SESSION_SECURE_COOKIE=true
   SAAS_ROOT_DOMAIN=rangkayo.my.id
   SAAS_HOME_DOMAIN=rangkayo.my.id
   SAAS_ADMIN_DOMAIN=admin.rangkayo.my.id
   SAAS_APP_DOMAIN=app.rangkayo.my.id
   SAAS_POS_DOMAIN=pos.rangkayo.my.id
   SAAS_ENFORCE_DOMAINS=true
   ```

   Cloudflare Tunnel hostnames diarahkan ke service Laravel yang sama; routing host dibedakan oleh aplikasi.

4. Jalankan migrasi:

   ```bash
   php artisan migrate --force
   ```

5. Cache konfigurasi production:

   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan event:cache
   ```

6. Restart process aplikasi/worker sesuai platform deploy.
7. Jalankan smoke check:

   ```bash
   php artisan app:smoke-check --url=https://domain-production.tld --require-build
   ```

8. Cek browser untuk `https://rangkayo.my.id`, `https://admin.rangkayo.my.id`, `https://app.rangkayo.my.id`, dan `https://pos.rangkayo.my.id`; login owner/platform admin/kasir, dashboard, POS, laporan penjualan, laporan stok, laba rugi, dan neraca.

## Queue Worker

Jalankan worker via Supervisor/systemd/container manager. Contoh command:

```bash
php artisan queue:work --tries=3 --timeout=90 --sleep=3
```

Operational notes:

- Restart worker setelah deploy: `php artisan queue:restart`.
- Pantau job gagal: `php artisan queue:failed`.
- Retry job gagal setelah masalah selesai: `php artisan queue:retry all`.

## Scheduler

Tambahkan cron/scheduler platform agar berjalan tiap menit:

```bash
* * * * * cd /path/to/akutansia && php artisan schedule:run >> /dev/null 2>&1
```

Command internal yang relevan:

- `subscriptions:reminders --days=3` — mengirim email reminder trial/subscription ke owner/admin tenant; dijadwalkan harian pukul 08:00 dan memakai audit log agar tidak terkirim ganda untuk target tanggal yang sama.
- `production:monitor --alert` — mengumpulkan metric database, failed/pending queue, error log, dan uptime URL; dijadwalkan tiap 5 menit dan mengirim alert email bila critical.
- `app:smoke-check` — readiness check internal/publik.

Monitoring env yang perlu diisi di production:

```bash
MONITORING_ALERT_EMAIL=ops@example.com
MONITORING_QUEUE_FAILED_THRESHOLD=1
MONITORING_LOG_ERROR_THRESHOLD=1
MONITORING_UPTIME_URLS=https://domain.com/health,https://domain.com/login
```

## Backup Database

Minimum policy:

- Backup PostgreSQL harian.
- Simpan backup di storage berbeda dari server aplikasi.
- Enkripsi backup bila berisi data pelanggan.
- Uji restore minimal sebelum go-live dan secara berkala.

Contoh backup PostgreSQL:

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%F-%H%M).dump"
```

Contoh restore ke database target:

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup-YYYY-MM-DD-HHMM.dump
```

## Rollback

1. Umumkan maintenance window bila perlu.
2. Stop queue worker sementara agar tidak memproses data pada versi campuran.
3. Restore source ke tag release sebelumnya.
4. Jalankan dependency sesuai tag tersebut.
5. Jika migrasi destructive sudah terlanjur jalan, restore database dari backup sebelum deploy.
6. Clear dan rebuild cache:

   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

7. Restart aplikasi dan queue worker.
8. Jalankan `php artisan app:smoke-check --url=https://domain-production.tld --require-build`.

## Incident Response Ringkas

- Error 500: cek `storage/logs/laravel.log`, status database, permission `storage/` dan `bootstrap/cache/`, lalu `php artisan optimize:clear` bila cache stale.
- Login gagal massal: cek session/cache driver, `APP_KEY`, HTTPS/cookie domain, dan database user.
- POS gagal checkout: cek stok produk/gudang, shift kasir aktif, period locking, dan error journal balance.
- Queue macet: cek worker process, Redis, `queue:failed`, lalu restart worker.
- Report lambat: cek filter periode/cabang, index database, dan volume journal/inventory movements.

## Smoke Routes Manual

- `/` landing
- `/login`
- `/health`
- `/dashboard`
- `/pos`
- `/cash-transactions`
- `/reports/sales`
- `/reports/stock`
- `/reports/profit-loss`
- `/reports/balance-sheet`
- `/platform/tenants` untuk platform admin
