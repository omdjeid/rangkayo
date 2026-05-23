# Akutansia

Akutansia adalah SaaS akuntansi + POS untuk UMKM, retail, dan bisnis multi-cabang. Aplikasi memakai arsitektur modular monolith dengan Laravel, Inertia.js, React, TypeScript, Tailwind CSS, PostgreSQL, dan Redis.

## Fitur Utama

- Multi-tenant dengan `tenant_id`, role user, tenant switcher, subscription trial/active/expired, dan platform admin.
- POS custom PWA-style dengan shift kasir, cetak struk thermal-friendly, pembayaran tunai/bank/QRIS, pengurangan stok, dan pencatatan pembukuan.
- Inventory perpetual: produk, kategori, unit, stok masuk, penyesuaian stok, transfer stok antar gudang, valuasi awal, dan laporan stok.
- Accounting double-entry: chart of accounts, jurnal balance, jurnal manual, kas/bank, transfer kas/bank, invoice, pembayaran piutang/hutang, period locking, audit log, ledger, trial balance, laba rugi, dan neraca.
- Reports: dashboard owner, penjualan per cabang/kasir/produk, laporan stok per cabang/gudang, laba rugi dan neraca dengan filter periode/cabang.
- UI mengikuti arah iOS/macOS: soft glass, rounded besar, shadow halus, clean, premium.

## Stack

- Backend: Laravel 12 + PHP 8.2+
- Frontend: Inertia.js + React 18 + TypeScript
- Styling: Tailwind CSS
- Database production: PostgreSQL
- Cache/queue production: Redis
- Testing: PHPUnit, Laravel feature tests, TypeScript build
- Formatting: Laravel Pint

## Setup Lokal

```bash
# Install dependency PHP dan JS
php .tools/composer.phar install
npm install

# Buat env dan app key
cp .env.example .env
php artisan key:generate

# Untuk testing lokal cepat bisa pakai SQLite
mkdir -p database
touch database/database.sqlite
# sesuaikan DB_CONNECTION=sqlite dan DB_DATABASE=database/database.sqlite di .env bila perlu

# Migrasi dan seed demo
php artisan migrate:fresh --seed --force

# Build asset production lokal
npm run build

# Jalankan aplikasi
php artisan serve
npm run dev
```

> Catatan Windows: jika Composer global tidak tersedia, gunakan `php .tools/composer.phar` seperti contoh di atas.

## Akun Demo

Seeder demo membuat akun berikut:

- Owner: `owner@akutansia.test` / `password`
- Kasir: `cashier@akutansia.test` / `password`

Tenant demo: `Demo Retail Payakumbuh` dengan cabang dan gudang default Payakumbuh.

## Validasi Lokal

Jalankan sebelum membuat release:

```bash
./vendor/bin/pint --test
php artisan test
npm run build
npm audit --audit-level=high --omit=dev
php .tools/composer.phar audit
php artisan app:smoke-check --require-build
```

## Health & Smoke Check

- `GET /up` adalah health endpoint bawaan Laravel.
- `GET /health` mengembalikan status JSON untuk database, cache, storage, dan route penting.
- `php artisan app:smoke-check` menjalankan readiness check internal tanpa browser/server eksternal.
- `php artisan app:smoke-check --url=https://domain.tld --require-build` dapat dipakai setelah deploy untuk cek endpoint publik.

## Dokumentasi Operasional

- `docs/PRODUCTION_PROGRESS.md` — single source of truth backlog dan progress produksi.
- `docs/PRODUCTION_CHECKLIST.md` — checklist konfigurasi production.
- `docs/RUNBOOK.md` — runbook deploy, rollback, backup, queue, scheduler, dan incident response.
- `CHANGELOG.md` — catatan perubahan release.

## Release Singkat

1. Pastikan `.env` production aman: `APP_ENV=production`, `APP_DEBUG=false`, PostgreSQL, Redis, mail, storage, session, queue, dan HTTPS sudah benar.
2. Jalankan migrasi di staging/production: `php artisan migrate --force`.
3. Build asset: `npm ci && npm run build`.
4. Optimasi Laravel: `php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache`.
5. Jalankan worker queue dan scheduler.
6. Jalankan smoke check: `php artisan app:smoke-check --url=https://domain.tld --require-build`.
7. Tag release dan simpan rollback plan.

## Catatan Keamanan

- Jangan commit `.env`, database lokal, storage key, vendor, node_modules, atau build artifact.
- Gunakan backup database terjadwal dan uji restore secara berkala.
- Batasi akses platform admin hanya untuk user yang benar-benar berwenang.
- Aktifkan HTTPS, secure cookie, log retention, queue monitoring, dan alerting sebelum live komersial.
