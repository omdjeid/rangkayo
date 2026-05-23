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

3. Pastikan `.env` production sudah benar dan aman.
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

8. Cek browser untuk `/`, `/login`, `/health`, login owner, dashboard, POS, laporan penjualan, laporan stok, laba rugi, dan neraca.

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

- `subscriptions:reminders` — mencatat reminder trial/subscription yang perlu dikirim.
- `app:smoke-check` — readiness check internal/publik.

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
