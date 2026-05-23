# Changelog

Semua perubahan penting Akutansia dicatat di file ini.

## [0.1.0-rc1] - 2026-05-23

### Added

- Release candidate awal untuk SaaS akuntansi + POS multi-tenant.
- Multi-tenant, user/role, tenant switcher, subscription, tenant settings, invitation, billing page, dan platform admin.
- Accounting core: chart of accounts, jurnal double-entry, jurnal manual, kas/bank, transfer kas/bank, invoice, pembayaran piutang/hutang, period locking, audit log, ledger, trial balance, laba rugi, dan neraca.
- Inventory: produk, kategori, unit, stok masuk, stock adjustment, transfer stok, inventory movements, dan laporan stok per cabang/gudang.
- POS: checkout, pembayaran tunai/bank/QRIS, shift kasir, receipt thermal-friendly, jurnal penjualan/HPP, dan branch scope untuk kasir.
- Reports: dashboard owner, penjualan per cabang/kasir/produk, stok, laba rugi, dan neraca dengan filter utama.
- Production readiness docs: README, checklist production, runbook deploy/rollback/backup.
- Health endpoint `/health` dan command `app:smoke-check` untuk readiness validation.

### Validation

- Formatter, full test suite, frontend build, dependency audit, LSP diagnostics, migration status, dan smoke check dijalankan sebagai release gate.

### Known Phase 2 Items

- Offline POS IndexedDB + sync.
- Fixed asset dan penyusutan.
- Pajak.
- Email reminder sungguhan untuk trial/subscription/invitation.
- Monitoring produksi lengkap dan alerting.
