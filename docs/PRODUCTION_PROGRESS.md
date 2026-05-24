# Production Progress — SaaS Akuntansi + POS

Dokumen ini adalah single source of truth untuk progres produksi project.

## Keputusan Produk

- Produk: SaaS akuntansi dengan POS terintegrasi.
- Target awal: UMKM, retail, multi cabang/outlet.
- Model tenancy awal: shared database dengan `tenant_id`, bukan 1 user = 1 database.
- Multi cabang: semua transaksi penting menyimpan `branch_id`; stok memakai `warehouse_id` bila relevan.
- Inventory: perpetual inventory; stok masuk menaikkan Persediaan, stok terjual menghasilkan HPP.
- Accounting: double-entry journal, immutable journal, period locking, audit log.
- UI direction: iOS/macOS style — soft glass, rounded besar, shadow halus, clean, premium.

## Stack Final

- Backend: Laravel
- Database: PostgreSQL
- Frontend: Inertia.js + React + TypeScript
- Styling/UI: Tailwind CSS + shadcn/ui-style components
- Cache/Queue: Redis
- Permission: Spatie Laravel Permission
- POS: custom PWA, bukan CRUD admin biasa
- Architecture: modular monolith

## Prinsip Arsitektur

- Jangan mulai dengan microservices.
- Pisahkan domain logic dari Controller/Page.
- Gunakan service/action untuk transaksi penting.
- Semua operasi akuntansi, POS, pembelian, stok harus berjalan dalam database transaction.
- Semua amount uang memakai `numeric/decimal`, bukan float/double.
- Query tenant wajib dibatasi oleh `tenant_id`.

## Modul Utama

- Tenancy & Subscription
- Users, Roles & Permissions
- Branches & Warehouses
- Accounting
- Inventory
- Purchases
- Sales
- POS
- Reports
- Audit & Period Locking

## Backlog Produksi

### Foundation

- [x] Pilih stack dan arsitektur final.
- [x] Buat dokumen progres produksi.
- [x] Bootstrap aplikasi Laravel + Inertia React + TypeScript.
- [x] Setup PostgreSQL environment dan konfigurasi `.env.example`.
- [x] Setup Tailwind UI foundation sesuai style iOS/macOS.
- [x] Setup code quality: formatter, linter, test runner.

### Core SaaS & Tenancy

- [x] Buat model `Tenant`, `TenantUser`, `Branch`, `Warehouse`.
- [x] Buat middleware/scope tenant aktif.
- [x] Buat role awal: owner, admin, accountant, branch_manager, cashier, warehouse_staff.
- [x] Buat onboarding tenant pertama.
- [x] Buat tenant/user management: tambah user, pilih role, assign cabang, nonaktifkan user.
- [x] Buat tenant switcher untuk user yang punya lebih dari satu tenant.
- [x] Buat subscription/plan SaaS: trial, active, expired, batas user/cabang/transaksi.
- [x] Hardening tenant isolation: audit semua query, route model binding tenant-safe, dan test isolasi antar tenant.
- [x] Buat register/onboarding tenant SaaS: owner, usaha, slug, cabang pertama, gudang default, subscription trial, COA default.
- [x] Buat super admin/platform admin: list tenant, detail tenant, plan/status/limit, suspend/activate, metric tenant.
- [x] Buat tenant settings: profil usaha, legal/tax, timezone, currency, preferensi struk/invoice.
- [x] Buat branch & warehouse management UI: tambah/edit/nonaktif cabang dan gudang, default gudang.
- [x] Buat invitation/team onboarding awal: invitation token, accept invite, set password/join tenant.
- [x] Buat subscription enforcement middleware dan billing/plan page tenant.
- [x] Buat email reminder placeholder untuk trial ending/subscription expired/invitation.
- [x] Buat platform audit/security awal: audit super admin action, status tenant, dan gate admin platform.

### Accounting Core

- [x] Buat chart of accounts.
- [x] Buat journal entries dan journal lines.
- [x] Validasi jurnal harus balance.
- [x] Buat jurnal manual dari UI.
- [x] Buat kontak customer/supplier.
- [x] Buat sales invoice dan purchase invoice.
- [x] Buat pembayaran piutang dan hutang.
- [x] Buat transfer kas/bank.
- [ ] Buat fixed asset dan penyusutan.
- [ ] Buat pajak.
- [x] Buat period locking.
- [x] Buat audit log.
- [x] Buat laporan awal: ledger, trial balance, profit & loss, balance sheet.

### Inventory

- [x] Buat product, category, unit.
- [x] Buat inventory movements.
- [x] Buat stock valuation awal.
- [x] Buat stock adjustment.
- [x] Buat transfer stok antar gudang/cabang.

### Purchases

- [x] Buat supplier.
- [x] Buat purchase dan purchase items.
- [x] Posting pembelian otomatis menambah stok.
- [x] Posting pembelian otomatis membuat jurnal persediaan vs kas/hutang.

### POS & Sales

- [x] Buat customer opsional.
- [x] Buat sales dan sale items.
- [x] Buat custom POS page/PWA.
- [x] Checkout POS mengurangi stok.
- [x] Checkout POS membuat jurnal penjualan dan HPP.
- [x] Support metode pembayaran tunai/bank/QRIS.
- [x] Support shift kasir: buka shift, modal awal, tutup shift, kas aktual, selisih kas, riwayat per kasir/cabang.
- [x] Support cetak struk: halaman receipt, layout thermal-friendly, item/qty/harga/total, pembayaran, kembalian, data cabang.
- [ ] Rancang offline mode dengan IndexedDB dan sync.

### Reports

- [x] Dashboard owner.
- [x] Laporan penjualan per cabang/kasir/produk dengan filter periode dan branch scope sesuai role.
- [x] Laporan stok per cabang/gudang.
- [x] Laporan laba rugi per cabang dan konsolidasi dengan filter cabang/periode.
- [x] Neraca konsolidasi dengan filter cabang/periode.

### UX & Copy Polish

- [x] Bersihkan wording teknis seperti “auto jurnal/jurnal otomatis” di UI user-facing menjadi bahasa bisnis yang lebih premium.

### Production Readiness Gate

Checklist ini menentukan kapan project boleh dianggap siap live production. Item fungsional besar yang belum wajib untuk launch awal dipisahkan sebagai fase berikutnya agar release candidate tetap realistis.

- [x] Setup version control dan release workflow: inisialisasi git repo, commit baseline, tag release, dan catatan perubahan.
- [x] Tulis dokumentasi project: README aplikasi, cara setup lokal, akun demo, arsitektur singkat, dan runbook deploy.
- [x] Tulis checklist konfigurasi production: `APP_ENV=production`, `APP_DEBUG=false`, key, PostgreSQL, Redis/cache/queue, mail, storage, scheduler, HTTPS, backup, dan log retention.
- [x] Tambah health check/smoke check untuk route utama dan readiness aplikasi.
- [x] Buat transfer kas/bank sebagai fitur akuntansi launch-blocker.
- [x] Buat laporan stok per cabang/gudang sebagai fitur operasional launch-blocker.
- [x] Lengkapi filter periode/cabang untuk laba rugi dan neraca.
- [x] Jalankan audit readiness akhir: formatter, test penuh, build frontend, audit dependency, LSP diagnostics, migrasi fresh PostgreSQL/SQLite, dan smoke test browser.
- [x] Siapkan deployment package: build asset, cache config/route/view, queue worker, scheduler, dan rollback plan.

### Multi-Cabang Advanced

- [x] Buat branch switcher untuk owner/admin dan active branch context.
- [x] Buat gudang selector eksplisit di POS, stok masuk, stock adjustment, purchase/invoice inventory.
- [x] Buat multi-branch access per user.
- [x] Buat approval transfer stok: draft, approve/kirim, receive/terima.
- [x] Buat report perbandingan cabang.

### Post-Launch / Phase 2

- [x] Rapikan navigasi sidebar agar menu laporan, administrasi, dan pengaturan tersusun sesuai konteks.
- [x] Rancang offline mode POS dengan IndexedDB dan sync.
- [ ] Buat fixed asset dan penyusutan.
- [ ] Buat pajak.
- [ ] Integrasi email reminder sungguhan untuk trial/subscription/invitation.
- [ ] Monitoring produksi: error tracking, uptime check, metric queue, dan alerting.

## Progress Log

### 2026-05-24

- Mulai peningkatan multi cabang/gudang: cabang dan gudang harus bisa diedit/nonaktif, gudang default bisa diatur, dan UX manajemen dibuat lebih jelas untuk owner/admin.
- Manajemen Cabang & Gudang ditingkatkan: cabang bisa diedit/aktif-nonaktif, gudang bisa diedit/pindah cabang/set default/aktif-nonaktif, serta UI daftar cabang menampilkan status dan form edit inline dengan gaya soft glass.
- Validasi multi cabang/gudang: `php artisan test --filter=MvpFlowTest` berhasil — 6 passed, 46 assertions.
- Validasi frontend multi cabang/gudang: `npm run build` berhasil.
- Validasi LSP multi cabang/gudang: 0 diagnostics pada controller, route, test, dan halaman TS terkait.
- Mulai penyelesaian multi-cabang advanced: branch switcher owner/admin, selector gudang eksplisit di transaksi, akses multi-cabang per user, approval transfer stok, dan report perbandingan cabang.
- Melanjutkan sesi terputus: fokus pertama branch switcher owner/admin dan active branch context, sambil menjaga backlog lengkap tetap di bagian Multi-Cabang Advanced.
- Branch switcher + active branch context selesai: owner/admin/accountant bisa memilih Semua Cabang atau cabang aktif dari navbar, session cabang direset saat ganti tenant, role cabang tetap terkunci pada cabang aksesnya, dashboard mendukung mode konsolidasi, dan shared Inertia auth membawa konteks cabang aktif.
- Validasi branch switcher: `php artisan test --filter=MvpFlowTest` berhasil — 8 passed, 79 assertions.
- Validasi frontend branch switcher: `npm run build` berhasil.
- Validasi LSP branch switcher: 0 diagnostics pada controller/support/layout/dashboard/test terkait.
- Mulai gudang selector eksplisit untuk POS, stok masuk, stock adjustment, dan invoice inventory agar transaksi baru tidak lagi diam-diam memakai gudang default.
- Gudang selector eksplisit selesai: POS, stok masuk, penyesuaian stok, dan invoice pembelian produk stok membawa `warehouse_id`; akses gudang difilter cabang/role; pembelian inventory memvalidasi gudang aktif dan mencatat movement ke gudang terpilih.
- Validasi gudang selector: `php artisan test --filter=MvpFlowTest` berhasil — 9 passed, 88 assertions.
- Validasi frontend gudang selector: `npm run build` berhasil.
- Validasi LSP gudang selector: 0 diagnostics pada controller/action/support/page/test terkait.
- Mulai multi-branch access per user: UI User & Akses perlu bisa memilih beberapa cabang dan backend menyimpan ke `tenant_user_branches`.
- Multi-branch access per user selesai: form User & Akses bisa centang beberapa cabang, backend menyimpan sinkronisasi `tenant_user_branches`, role cabang wajib punya minimal satu cabang, dan opsi gudang transaksi mengikuti semua cabang yang diizinkan.
- Validasi multi-branch access: `php artisan test --filter=MvpFlowTest` berhasil — 10 passed, 105 assertions.
- Validasi frontend multi-branch access: `npm run build` berhasil.
- Validasi LSP multi-branch access: 0 diagnostics pada controller/support/page/test terkait.
- Mulai approval transfer stok: alur transfer perlu berubah dari langsung movement menjadi draft, approve/kirim, lalu receive/terima.
- Approval transfer stok selesai: transfer dibuat sebagai draft, tombol Setujui/Kirim mencatat movement keluar dan status `approved`, tombol Terima mencatat movement masuk dan status `received`, lengkap dengan requester/approver/receiver.
- Validasi approval transfer stok: `php artisan test --filter=MvpFlowTest` berhasil — 11 passed, 117 assertions.
- Validasi frontend approval transfer stok: `npm run build` berhasil.
- Validasi LSP approval transfer stok: 0 diagnostics pada action/controller/page/route/test terkait.
- Mulai report perbandingan cabang untuk membandingkan omzet, transaksi, laba kotor, dan nilai stok antar cabang dalam periode.
- Report perbandingan cabang selesai: halaman `/reports/branch-comparison` menampilkan filter periode, summary total, dan tabel cabang berisi transaksi, omzet, laba kotor, margin, stok, serta nilai stok dengan akses mengikuti cabang user.
- Validasi report perbandingan cabang: `php artisan test --filter=MvpFlowTest` berhasil — 12 passed, 134 assertions.
- Validasi frontend report perbandingan cabang: `npm run build` berhasil.
- Validasi LSP report perbandingan cabang: 0 diagnostics pada controller/route/page/layout/test terkait.
- Mulai final audit setelah penyelesaian Multi-Cabang Advanced: formatter, full test, build frontend, fresh migration seed, smoke check, dan LSP diagnostics.
- Final audit Multi-Cabang Advanced berhasil: `./vendor/bin/pint --test`, `php artisan test` — 48 passed, 246 assertions, `npm run build`, `php artisan migrate:fresh --seed --force`, `php artisan app:smoke-check --require-build`, dan LSP diagnostics 0 pada 32 file terkait.
- Mulai Phase 2 kecil: rapikan grouping sidebar agar User & Akses, Cabang & Gudang, Pengaturan Usaha, dan Billing tidak berada di grup Laporan.
- Sidebar dirapikan: menu dipisah menjadi Utama, Penjualan, Inventory, Akuntansi & Kas, Laporan, Administrasi, dan Pengaturan; User & Akses/Cabang & Gudang keluar dari Laporan.
- Validasi sidebar: `npm run build` berhasil dan LSP diagnostics 0 pada layout sidebar.
- Mulai desain offline mode POS: audit kebutuhan IndexedDB, antrean checkout lokal, snapshot produk/gudang, dan strategi sync aman.
- Desain offline mode POS selesai di `docs/POS_OFFLINE_MODE_PLAN.md`: scope MVP, batasan, schema IndexedDB, sync flow, endpoint server yang disarankan, UI states, risiko, dan rencana implementasi bertahap.

### 2026-05-23

- Mulai production-readiness: audit status project menunjukkan demo/UAT sudah valid, tetapi live production masih membutuhkan release workflow, dokumentasi deploy, readiness checklist, health/smoke check, fitur transfer kas/bank, laporan stok, filter laporan keuangan, dan audit akhir.
- Mulai tahap 1 readiness foundation: release workflow, README/runbook/checklist production, dan health/smoke readiness check.
- Dokumentasi production ditambahkan: `README.md`, `docs/PRODUCTION_CHECKLIST.md`, `docs/RUNBOOK.md`, dan `CHANGELOG.md` release candidate.
- Health/readiness ditambahkan: endpoint `/health` dan command `php artisan app:smoke-check` untuk cek database, cache, storage, route penting, tenant seed, asset build, serta endpoint publik opsional.
- Mulai tahap 2 launch-blocker: transfer kas/bank, laporan stok per cabang/gudang, serta filter cabang/periode untuk laba rugi dan neraca.
- Transfer kas/bank selesai: transaksi tipe transfer antar akun kas/bank membuat jurnal balance debit tujuan dan kredit asal, tersedia di UI Kas/Bank.
- Laporan stok selesai: halaman `/reports/stock` menampilkan filter cabang/gudang/tanggal, ringkasan produk, qty on hand, nilai stok, dan status stok aman/menipis/habis.
- Laporan laba rugi dan neraca sudah memakai filter periode/cabang/konsolidasi.
- Validasi launch-blocker: `php artisan test --filter=AccountingCoreTest` berhasil — 3 passed, 15 assertions.
- Validasi launch-blocker: `php artisan test --filter=MvpFlowTest` berhasil — 4 passed, 36 assertions.
- Validasi launch-blocker: `npm run build` berhasil.
- Validasi LSP launch-blocker: 0 diagnostics pada file PHP/TS terkait.
- Mulai tahap 3 final release audit: full formatter/test/build/audit, migration freshness, smoke check, deployment package verification, git baseline, dan release tag.
- Final audit berhasil: `./vendor/bin/pint --test`, `php artisan test` — 40 passed, 148 assertions, `npm run build`, `npm audit --audit-level=high --omit=dev`, `npm audit` summary 0 vulnerabilities, `php .tools/composer.phar audit`, `php artisan migrate:status` — 0 pending / 13 listed, dan `php artisan app:smoke-check --require-build` berhasil.
- Fresh migration SQLite berhasil: `php artisan migrate:fresh --seed --force` menjalankan 13 migration dan seed demo owner/kasir, dilanjutkan `php artisan app:smoke-check --require-build` berhasil.
- Release workflow selesai: git repo diinisialisasi, baseline commit `d7cf4c4` dibuat, dan tag release `v0.1.0-rc1` dibuat.
- Deployment package siap secara dokumentasi dan runbook: build asset tersedia, route/cache/view/event cache command ada di `docs/RUNBOOK.md`, queue worker/scheduler/backup/rollback plan terdokumentasi.

### 2026-05-22

- Halaman `/platform/tenants` diperkaya: summary card tenant aktif/suspend/trial, total user/cabang/transaksi, omzet POS, owner tenant, info bisnis, gudang/produk/kontak/invoice/jurnal, progress pemakaian limit, periode trial/subscription, serta redirect `/platform` ke `/platform/tenants`.
- Validasi super admin data: `php artisan test --filter=MvpFlowTest` berhasil — 4 passed, 35 assertions.
- Validasi super admin data: `npm run build` berhasil.
- Validasi super admin data: `./vendor/bin/pint --test` berhasil.
- Super admin dipisah dari tenant app: ditambahkan `PlatformLayout`, menu platform sendiri, halaman `/platform/tenants` tidak lagi memakai sidebar tenant, dan tenant app punya tombol cepat `Super Admin` khusus user platform admin.
- Validasi super admin split: `npm run build` berhasil.
- Validasi super admin split: `php artisan test --filter=MvpFlowTest` berhasil — 4 passed, 35 assertions.
- Validasi super admin split: `./vendor/bin/pint --test` berhasil.
- Fondasi SaaS selesai dieksekusi: register/onboarding tenant otomatis membuat owner, tenant/usaha, cabang pertama, gudang default, subscription trial, COA, unit, dan kategori produk awal.
- Ditambahkan platform admin: middleware super admin, halaman `/platform/tenants`, update status tenant, plan/status subscription, limit user/cabang/transaksi, dan platform audit log.
- Ditambahkan tenant settings: profil usaha, legal/tax, currency/timezone, prefix struk/invoice, default account code.
- Ditambahkan branch & warehouse management UI untuk tambah cabang dan gudang.
- Ditambahkan invitation/team onboarding awal: buat invitation token, halaman accept invitation, set password, join tenant sesuai role/cabang.
- Ditambahkan billing/plan page tenant dan middleware subscription active untuk membatasi tenant expired/suspended.
- Ditambahkan command placeholder `subscriptions:reminders` untuk mencatat reminder trial/subscription yang akan dikirim email.
- Ditambahkan migration SaaS platform: `is_platform_admin`, tenant settings columns, tenant invitations, dan platform audit logs.
- Validasi fondasi SaaS: migration lokal berhasil dengan `php artisan migrate --force`.
- Validasi fondasi SaaS: `./vendor/bin/pint --test` berhasil.
- Validasi fondasi SaaS: `php artisan test` berhasil — 39 passed, 141 assertions.
- Validasi fondasi SaaS: `npm run build` berhasil.
- Perbaikan akses shift kasir: pada mode POS kasir full-screen kini ada tombol `Shift Kasir` di header dan warning shift memiliki tombol `Buka Shift`; warning shift tidak muncul untuk owner/admin karena shift hanya wajib untuk kasir.
- Validasi akses shift kasir: `npm run build` berhasil.
- Validasi akses shift kasir: `php artisan test --filter=MvpFlowTest` berhasil — 4 passed, 35 assertions.
- Sembilan poin produksi versi awal selesai dieksekusi: report penjualan detail, shift kasir, cetak struk, stock adjustment, stock transfer, purchase inventory automation, tenant/user management, tenant switcher, subscription SaaS, tenant isolation hardening, dan polish wording UI.
- Ditambahkan migration production hardening: tenant subscriptions, cashier shifts, user/shift pada sales, product/warehouse pada invoice items, dan status aktif pivot tenant user.
- POS sekarang menyimpan user kasir dan shift aktif, serta menyediakan URL struk setelah checkout.
- Kasir harus membuka shift sebelum checkout; shift bisa dibuka/ditutup dengan modal awal, kas aktual, expected cash, dan selisih kas.
- Ditambahkan halaman struk thermal-friendly dan halaman laporan penjualan per cabang/kasir/produk.
- Ditambahkan halaman penyesuaian stok dan transfer stok antar gudang/cabang.
- Invoice pembelian kini bisa memakai product/warehouse untuk menambah stok dan membuat pembukuan persediaan vs hutang.
- Ditambahkan halaman User & Akses untuk tambah user, role, cabang, dan status aktif; Inertia workspace kini memuat opsi tenant untuk switcher.
- Demo seeder kini membuat subscription trial dan mengisi pivot `tenant_users.is_active`.
- Validasi 9 poin: migration lokal berhasil dijalankan dengan `php artisan migrate --force`.
- Validasi 9 poin: `./vendor/bin/pint --test` berhasil.
- Validasi 9 poin: `php artisan test` berhasil — 39 passed, 139 assertions.
- Validasi 9 poin: `npm run build` berhasil.
- Sembilan poin perbaikan lanjutan sudah dimasukkan ke backlog produksi: report detail, shift kasir, cetak struk, stock adjustment/transfer, purchase inventory automation, tenant/user management, subscription SaaS, tenant isolation hardening, dan polish wording UI.
- Cleanup copy UI: teks MVP/testable di dashboard dan landing diganti menjadi copy production-ready.
- Validasi cleanup copy: `npm run build` berhasil.
- Validasi cleanup copy: `php artisan test --filter=MvpFlowTest` berhasil — 4 passed, 35 assertions.
- Validasi LSP file UI cleanup: 0 diagnostics.

- POS dipisahkan untuk role kasir: cashier hanya bisa mengakses `/pos` dan checkout POS; akses dashboard/akuntansi otomatis diarahkan ke POS.
- `CurrentTenant` kini role-aware dan branch-aware: role serta cabang dibaca dari pivot `tenant_users`; kasir/branch-scoped user memakai cabang assigned.
- Ditambahkan middleware `tenant.role` dan `cashier.redirect` untuk pembatasan route owner/admin/accountant/branch_manager/cashier/warehouse_staff.
- Login kasir otomatis diarahkan ke `/pos`, sedangkan role non-kasir tetap ke dashboard.
- Inertia shared props sekarang membawa workspace tenant, role, dan cabang untuk navigation role-aware.
- Sidebar memfilter menu berdasarkan role; kasir hanya mendapat POS.
- Halaman POS punya mode kasir full-screen tanpa sidebar, tetap mengikuti gaya iOS/macOS soft glass.
- Recent sales POS dibatasi ke cabang aktif/assigned, sehingga kasir melihat transaksi cabangnya saja.
- Demo seeder menambah user kasir: `cashier@akutansia.test / password`.
- Ditambahkan test `cashier is limited to pos and uses assigned branch`.
- Validasi POS split: `npm run build` berhasil.
- Validasi POS split: `php artisan test` berhasil — 39 passed, 139 assertions.
- Validasi formatter POS split: `./vendor/bin/pint --test` berhasil.
- Validasi LSP file TS yang diubah: 0 diagnostics; LSP PHP hanya menyisakan hint bawaan bootstrap `$exceptions` unused.

### 2026-05-21

- Context mode MCP aktif dan doctor status OK.
- Project folder awal masih kosong.
- Stack diputuskan: Laravel + PostgreSQL + Inertia React + TypeScript + Tailwind, modular monolith.
- Dibuat dokumen produksi ini sebagai acuan kerja.
- Mulai bootstrap aplikasi Laravel awal.
- Composer tidak tersedia global, jadi dipasang lokal di `.tools/composer.phar`.
- Laravel 12 berhasil dibuat dengan Breeze Inertia React TypeScript.
- `.env.example` dan `.env` diarahkan ke PostgreSQL database `akutansia`.
- NPM dependency disesuaikan (`@types/node` ^22.12.0) agar cocok dengan Vite 7.
- UI awal landing, dashboard, guest layout, dan authenticated layout dibuat dengan arah iOS/macOS soft glass.
- Validasi: `npm run build` berhasil.
- Validasi: `php artisan test` berhasil — 25 passed, 61 assertions.
- Validasi LSP TypeScript untuk file UI yang diubah: 0 diagnostics.
- Mulai domain foundation: tenancy, cabang, gudang, accounting, inventory.
- Dibuat migration dan model: tenants, tenant_users, branches, warehouses.
- Dibuat migration dan model: accounts, journal_entries, journal_lines.
- Dibuat `PostJournalEntryAction` untuk validasi jurnal minimal 2 baris dan harus balance.
- Dibuat migration dan model: product_categories, units, products, inventory_movements.
- Ditambahkan relasi model utama untuk tenant, cabang, gudang, akun, jurnal, produk, dan movement stok.
- Validasi domain foundation: `php artisan test` berhasil — 28 passed, 70 assertions.
- Validasi formatter: `composer exec pint -- --test` berhasil.
- Validasi build frontend: `npm run build` berhasil.
- Validasi LSP untuk file PHP domain yang diubah: 0 diagnostics.
- Mulai onboarding seed untuk tenant demo, role awal, dan akun default.
- Dibuat `DefaultChartOfAccounts` berisi akun awal: Kas, Bank, Piutang, Persediaan, Hutang, Modal, Penjualan, HPP, Beban.
- Dibuat `DemoTenantSeeder` untuk user owner, tenant demo Payakumbuh, cabang, gudang, COA, unit, kategori, dan produk contoh.
- `DatabaseSeeder` menjalankan demo seeder sebagai onboarding awal.
- Role awal disimpan pada pivot `tenant_users.role`; role demo: owner. Backlog role lain tetap disiapkan untuk permission layer berikutnya.
- Validasi onboarding seed: `php artisan test` berhasil — 29 passed, 76 assertions.
- Validasi formatter: `composer exec pint -- --test` berhasil.
- Validasi build frontend: `npm run build` berhasil.
- Validasi LSP untuk seeder/support/test yang diubah: 0 diagnostics.
- Mulai menjalankan program untuk testing lokal.
- PostgreSQL lokal membutuhkan password, jadi runtime test sementara dialihkan ke SQLite (`database/database.sqlite`) agar user bisa langsung test UI.
- `php artisan migrate:fresh --seed --force` berhasil pada SQLite lokal.
- Laravel dev server berjalan di `http://127.0.0.1:8001` PID 1607.
- Vite dev server berjalan di `http://127.0.0.1:5175` PID 1608.
- Smoke test URL berhasil: `/` 200 dan `/login` 200.
- Mulai membuat MVP testable: menu, akun, produk, stok masuk, jurnal, dan POS sederhana.
- Dibuat tabel sales dan sale_items untuk transaksi POS.
- Dibuat `CurrentTenant` helper untuk mengambil tenant/cabang/gudang aktif dari user login.
- Dibuat `RecordStockInAction`: stok masuk membuat inventory movement dan jurnal Persediaan vs Kas/Bank/Hutang.
- Dibuat `CheckoutPosSaleAction`: checkout POS membuat sale, sale items, stok keluar, jurnal Penjualan, dan jurnal HPP/Persediaan.
- Dibuat halaman/menu testable: Dashboard, POS, Produk, Stok Masuk, Akun, Jurnal.
- Dashboard kini menampilkan metric penjualan, nilai stok, total jurnal, shortcut modul, dan transaksi terakhir.
- Produk bisa dibuat, diedit, dan menampilkan stok on hand.
- Stok Masuk bisa dicatat dari UI dan otomatis membuat jurnal.
- POS sederhana bisa pilih produk, keranjang, pembayaran tunai/bank, checkout, mengurangi stok, dan membuat jurnal otomatis.
- Jurnal menampilkan entry dan detail lines debit/kredit.
- Database lokal SQLite di-refresh dan seed ulang untuk testing MVP.
- Validasi MVP: `php artisan test` berhasil — 31 passed, 88 assertions.
- Validasi formatter: `composer exec pint -- --test` berhasil.
- Validasi frontend: `npm run build` berhasil.
- Validasi LSP untuk file MVP: 0 diagnostics.
- Smoke test server berjalan: `http://127.0.0.1:8001`, login, dan dashboard 200 OK.
- Fitur edit produk ditambahkan: route `PATCH /products/{product}`, validasi tenant, unique SKU/barcode dengan ignore current product, dan UI mode edit pada halaman Produk.
- Validasi edit produk: `php artisan test --filter=MvpFlowTest` berhasil — 3 passed, 17 assertions.
- Validasi penuh setelah edit produk: `php artisan test` berhasil — 32 passed, 93 assertions.
- Validasi frontend setelah edit produk: `npm run build` berhasil.
- Validasi formatter setelah edit produk: `composer exec pint -- --test` berhasil.
- Validasi LSP file edit produk: 0 diagnostics.
- Mulai perbaikan usability form: label, helper text, dan error text agar field tidak hanya mengandalkan placeholder.
- Dibuat reusable component `FormField` untuk label, required marker, helper text, dan error text.
- Form Produk sekarang punya keterangan field: SKU, Barcode, Nama Produk, Kategori, Unit, Harga Modal, Harga Jual.
- Form Stok Masuk sekarang punya keterangan field: Produk, Jumlah Masuk, Harga Modal per Unit, Sumber Pembayaran.
- Form Akun sekarang punya keterangan field: Kode Akun, Nama Akun, Tipe Akun, Saldo Normal, Penanda Kas/Bank.
- Form POS sekarang punya keterangan field untuk jumlah item, metode pembayaran, dan nominal dibayar.
- Validasi usability form: `npm run build` berhasil.
- Validasi MVP setelah label form: `php artisan test --filter=MvpFlowTest` berhasil — 3 passed, 17 assertions.
- Validasi penuh setelah label form: `php artisan test` berhasil — 32 passed, 93 assertions.
- Validasi formatter setelah label form: `composer exec pint -- --test` berhasil.
- Validasi LSP file form: 0 diagnostics.
- Mulai perluasan accounting core: pengeluaran, pemasukan, kas/bank, buku besar, neraca saldo, laba rugi, dan neraca.
- Dibuat tabel dan model `cash_transactions` untuk transaksi Kas/Bank, Pengeluaran, dan Pemasukan non-POS.
- Dibuat `RecordCashTransactionAction`: income dan expense otomatis membentuk jurnal balance.
- Dibuat halaman `Kas/Bank & Pengeluaran` untuk input pengeluaran/pemasukan dengan akun kas/bank dan akun lawan.
- Dibuat laporan awal berbasis jurnal: Buku Besar, Neraca Saldo, Laba Rugi, dan Neraca.
- Menu aplikasi diperluas: Kas/Bank, Buku Besar, Neraca Saldo, Laba Rugi, Neraca.
- Database lokal SQLite di-refresh dan seed ulang untuk accounting core.
- Validasi accounting core: `php artisan test --filter=AccountingCoreTest` berhasil — 2 passed, 9 assertions.
- Validasi penuh accounting core: `php artisan test` berhasil — 34 passed, 102 assertions.
- Validasi frontend accounting core: `npm run build` berhasil.
- Validasi formatter accounting core: `composer exec pint -- --test` berhasil.
- Validasi LSP accounting core: 0 diagnostics.
- Mulai melengkapi accounting v1: jurnal manual, kontak customer/supplier, invoice piutang/hutang, pembayaran invoice, dan menu terkait.
- Dibuat tabel/model `contacts` untuk customer, supplier, dan kontak yang bisa keduanya.
- Dibuat tabel/model `invoices`, `invoice_items`, dan `invoice_payments` untuk sales invoice, purchase invoice, piutang/hutang, dan pembayaran.
- Seeder demo ditambah customer umum dan supplier demo; COA ditambah beban gaji, sewa, listrik/air, dan pendapatan lain-lain.
- Dibuat `PostManualJournalAction` untuk posting jurnal manual balance dari UI.
- Dibuat `CreateInvoiceAction`: sales invoice otomatis Debit Piutang/Kredit Pendapatan; purchase invoice otomatis Debit akun biaya/aset/Kredit Hutang.
- Dibuat `PayInvoiceAction`: pembayaran sales invoice otomatis Debit Kas/Bank/Kredit Piutang; pembayaran purchase invoice otomatis Debit Hutang/Kredit Kas/Bank.
- Dibuat halaman Kontak, Jurnal Manual, dan Invoice Piutang/Hutang + pembayaran invoice.
- Menu aplikasi ditambah Kontak, Invoice, dan Jurnal Manual.
- Database lokal SQLite di-refresh dan seed ulang untuk accounting v1.
- Validasi accounting v1: `php artisan test --filter=AccountingV1Test` berhasil — 2 passed, 10 assertions.
- Validasi penuh accounting v1: `php artisan test` berhasil — 36 passed, 112 assertions.
- Validasi frontend accounting v1: `npm run build` berhasil.
- Validasi formatter accounting v1: `composer exec pint -- --test` berhasil.
- Validasi LSP accounting v1: 0 diagnostics.
- Mulai refactor navigation: ubah navbar panjang menjadi sidebar terstruktur dengan grup menu akuntansi.
- Layout aplikasi diubah dari navbar horizontal panjang menjadi sidebar kiri glassmorphism.
- Menu dikelompokkan: Utama, Operasional, Penjualan & Pembelian, Kas & Bank, Akuntansi, Laporan.
- Topbar disederhanakan untuk workspace dan user dropdown.
- Mobile navigation memakai drawer/dropdown dari sidebar yang sama.
- Validasi sidebar: `npm run build` berhasil.
- Validasi key tests sidebar: AccountingCoreTest, AccountingV1Test, MvpFlowTest berhasil — 7 passed, 36 assertions.
- Validasi penuh setelah sidebar: `php artisan test` berhasil — 36 passed, 112 assertions.
- Validasi formatter setelah sidebar: `composer exec pint -- --test` berhasil.
- Smoke test server setelah sidebar: `/dashboard`, `/invoices`, `/reports/profit-loss` 200 OK.
- Mulai membuat sidebar accordion/collapsible agar daftar menu tidak panjang dan tidak perlu scroll terus.
- Sidebar group sekarang collapsible/accordion; default hanya grup Utama dan grup aktif yang terbuka.
- Grup aktif otomatis terbuka berdasarkan route saat ini, grup lain bisa dibuka/tutup manual.
- Validasi accordion sidebar: `npm run build` berhasil.
- Validasi key tests accordion sidebar: AccountingCoreTest, AccountingV1Test, MvpFlowTest berhasil — 7 passed, 36 assertions.
- Validasi penuh setelah accordion sidebar: `php artisan test` berhasil — 36 passed, 112 assertions.
- Validasi formatter setelah accordion sidebar: `composer exec pint -- --test` berhasil.
- Smoke test accordion sidebar: `/dashboard`, `/invoices`, `/reports/balance-sheet` 200 OK.
- Mulai hardening accounting production: period locking dan audit log sebagai fondasi kontrol akuntansi.
- Dibuat tabel/model `accounting_periods` untuk menyimpan periode terkunci per tenant atau cabang.
- Dibuat tabel/model `audit_logs` untuk mencatat aktivitas penting: posting jurnal dan lock periode.
- Dibuat `EnsureAccountingPeriodOpenAction` agar semua posting jurnal menolak tanggal yang masuk periode terkunci.
- Dibuat `LockAccountingPeriodAction` untuk mengunci rentang tanggal dan otomatis menulis audit log.
- `PostJournalEntryAction` sekarang mengisi `created_by`, mengecek period lock, dan menulis audit log `journal_entry.posted`.
- Dibuat halaman `Periode Akuntansi` untuk lock periode dari UI.
- Dibuat halaman `Audit Log` untuk melihat riwayat aktivitas kontrol akuntansi.
- Menu Akuntansi ditambah `Periode Akuntansi` dan `Audit Log`.
- Migration accounting controls dijalankan di SQLite lokal dengan `php artisan migrate --force`.
- Validasi period lock & audit log: AccountingControlsTest berhasil — 2 passed, 9 assertions.
- Validasi key tests setelah controls: AccountingControlsTest, AccountingCoreTest, AccountingV1Test, MvpFlowTest berhasil — 9 passed, 45 assertions.
- Validasi frontend setelah controls: `npm run build` berhasil.
- Validasi penuh setelah controls: `php artisan test` berhasil — 38 passed, 121 assertions.
- Validasi formatter setelah controls: `composer exec pint -- --test` berhasil.
- Validasi LSP controls: 0 diagnostics.
- Smoke test controls: `/accounting-periods`, `/audit-logs`, `/journal-entries` 200 OK.
