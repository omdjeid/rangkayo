# POS Offline Mode Plan

Tujuan: POS tetap bisa melayani transaksi saat koneksi tidak stabil, lalu melakukan sinkronisasi aman saat online kembali.

## Scope MVP Offline

- Offline hanya untuk halaman POS kasir.
- Data yang disimpan lokal:
  - snapshot produk aktif untuk tenant/cabang/gudang aktif;
  - snapshot gudang yang bisa diakses;
  - cart dan antrean checkout offline;
  - metadata shift kasir aktif.
- Checkout offline membuat nomor lokal sementara dan masuk antrean sync.
- Saat online, antrean dikirim ke server satu per satu.

## Batasan Launch Awal

- Offline checkout hanya boleh untuk user yang sudah pernah membuka POS saat online.
- Harga memakai snapshot terakhir.
- Stok lokal bersifat estimasi; server tetap sumber kebenaran.
- Jika sync gagal karena stok server tidak cukup, transaksi ditandai `failed` dan perlu resolusi manual.
- Pembayaran offline dibatasi ke metode yang sudah tersedia: tunai dan bank/QRIS.

## IndexedDB Schema

Database: `akutansia_pos_offline_v1`

Object stores:

1. `snapshots`
   - key: `workspaceKey` (`tenantId:branchId:warehouseId`)
   - fields: `tenantId`, `branchId`, `warehouseId`, `products`, `warehouses`, `capturedAt`

2. `carts`
   - key: `workspaceKey`
   - fields: `items`, `paymentMethod`, `paidTotal`, `updatedAt`

3. `checkout_queue`
   - key: `localId`
   - fields: `localId`, `workspaceKey`, `warehouseId`, `paymentMethod`, `paidTotal`, `items`, `total`, `status`, `attempts`, `lastError`, `createdAt`, `syncedAt`, `receiptUrl`

## Sync Flow

1. POS online load:
   - Simpan snapshot produk/gudang ke IndexedDB.
   - Proses antrean `pending` jika ada koneksi.

2. POS offline checkout:
   - Validasi cart terhadap snapshot lokal.
   - Kurangi stok estimasi lokal.
   - Simpan transaksi ke `checkout_queue` status `pending`.
   - Tampilkan receipt lokal sederhana / nomor lokal.

3. Online kembali:
   - Worker/client mengirim queue FIFO ke `pos.checkout`.
   - Jika berhasil: status `synced`, simpan `receipt_url` server.
   - Jika gagal validasi/server: status `failed`, simpan pesan error.

## Server Endpoint Tambahan yang Disarankan

- `GET /pos/offline-snapshot?warehouse_id=...`
  - mengembalikan produk, gudang, branch, tenant, shift aktif, timestamp.
- `POST /pos/offline-sync`
  - menerima satu transaksi offline dengan `local_id` idempotent.
  - server menyimpan mapping local_id agar retry aman.

## UI States

- Badge koneksi: Online / Offline / Sinkronisasi.
- Panel antrean: jumlah pending, synced, failed.
- Button `Sinkronkan sekarang`.
- Alert jika snapshot sudah terlalu lama, misalnya > 24 jam.

## Risiko & Mitigasi

- Stok minus karena checkout offline paralel:
  - server menolak sync bila stok tidak cukup;
  - transaksi failed masuk resolusi manual.
- Duplikasi saat retry:
  - gunakan `local_id` idempotent di server.
- Data harga stale:
  - tampilkan waktu snapshot;
  - minta refresh online berkala.

## Rencana Implementasi Bertahap

1. Fondasi client IndexedDB helper dan hook status koneksi.
2. Simpan snapshot POS saat online.
3. Simpan cart draft lokal.
4. Offline checkout queue lokal.
5. Endpoint snapshot dan sync idempotent.
6. UI antrean sync dan resolusi failed.
7. Test browser/PHP untuk idempotency dan stok conflict.
