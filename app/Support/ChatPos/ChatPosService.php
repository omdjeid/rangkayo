<?php

namespace App\Support\ChatPos;

use App\Models\Branch;
use App\Models\Contact;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Sales\Sale;
use App\Models\Warehouse;
use App\Support\Printing\BrowserPrintQueue;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ChatPosService
{
    public function __construct(
        private readonly ChatOrderParser $parser,
        private readonly TelegramPosLinkRepository $links,
        private readonly BrowserPrintQueue $printQueue,
    ) {
    }

    public function handleMessage(string|int $chatId, string $message): string
    {
        $message = trim($message);
        $link = $this->links->findByChatId($chatId);

        // Handle /link command
        if (str_starts_with(strtolower($message), '/link ')) {
            $code = trim(substr($message, 6));
            $linked = $this->links->consumePairingCode($code, $chatId);

            return $linked
                ? 'Telegram berhasil terhubung ke '.($linked['tenant_name'] ?? 'tenant').' sebagai '.($linked['user_name'] ?? 'kasir').(($linked['store_name'] ?? null) ? ' untuk outlet '.$linked['store_name'] : '').'.'
                : 'Kode pairing tidak valid atau sudah kedaluwarsa. Generate kode baru dari dashboard RangKayo.';
        }

        // Handle /unlink command
        if (in_array(strtolower($message), ['/unlink', 'unlink'], true)) {
            $this->links->unlink($chatId);
            Cache::forget($this->draftKey($chatId));

            return 'Telegram POS sudah diputus dari akun RangKayo.';
        }

        // Must be linked first
        if (! $link) {
            return 'Telegram belum terhubung. Buka dashboard RangKayo > Store Settings > Telegram POS, generate kode, lalu kirim /link KODE.';
        }

        $tenantId = (string) $link['tenant_id'];
        $cashierId = (string) $link['user_id'];

        // Handle cancel
        if (in_array(strtolower($message), ['batal', 'cancel'], true)) {
            Cache::forget($this->draftKey($chatId));
            return 'Draft transaksi dibatalkan.';
        }

        // Handle confirm
        if (in_array(strtolower($message), ['ok', 'ya', 'confirm'], true)) {
            return $this->confirm($chatId, $tenantId, $cashierId, $link);
        }

        // Parse order
        $parsed = $this->parser->parse($message);

        if ($parsed['items'] === []) {
            return 'Format belum terbaca. Contoh: kopi susu 1, americano 2, andi, cash';
        }

        if (! $parsed['payment_method']) {
            return 'Metode bayar belum terbaca. Tambahkan cash/qris/transfer. Contoh: kopi susu 1, andi, cash';
        }

        $draft = $this->buildDraft($tenantId, $parsed, (string) ($link['store_id'] ?? ''));
        $draft['tenant_name'] = (string) ($link['tenant_name'] ?? '');
        $draft['cashier_name'] = (string) ($link['user_name'] ?? '');
        $draft['store_name'] = (string) ($link['store_name'] ?? '');
        Cache::put($this->draftKey($chatId), $draft, now()->addMinutes(10));

        return $this->formatDraft($draft)."\n\nBalas OK untuk simpan transaksi, atau BATAL untuk membatalkan.";
    }

    private function buildDraft(string $tenantId, array $parsed, string $preferredBranchId = ''): array
    {
        $products = $this->productsForTenant($tenantId);

        $matchNotes = [];
        $items = collect($parsed['items'])->map(function (array $item) use ($products, &$matchNotes): array {
            $match = $this->matchProduct((string) $item['name'], $products);

            if (($match['status'] ?? '') !== 'matched') {
                throw new RuntimeException($match['message']);
            }

            $product = $match['product'];
            $qty = (int) $item['qty'];
            $stock = (int) ($product['stock'] ?? 0);

            if ($stock < $qty) {
                throw new RuntimeException('Stok '.$product['name'].' tidak cukup. Tersisa '.$stock.'.');
            }

            if (($match['note'] ?? '') !== '') {
                $matchNotes[] = $match['note'];
            }

            $price = (int) ($product['selling_price'] ?? 0);

            return [
                'id' => (string) $product['id'],
                'name' => (string) $product['name'],
                'price' => $price,
                'qty' => $qty,
                'discount' => 0,
                'subtotal' => $price * $qty,
                'cost_price' => (int) ($product['cost_price'] ?? 0),
            ];
        })->values();

        $subtotal = (int) $items->sum('subtotal');
        $contactId = $this->findContactId($tenantId, $parsed['customer']);

        return [
            'tenant_id' => $tenantId,
            'sale_number' => 'CHAT-'.now()->format('ymdHis'),
            'branch_id' => $preferredBranchId,
            'customer_name' => $parsed['customer'],
            'customer_id' => $contactId,
            'subtotal' => $subtotal,
            'discount' => 0,
            'tax' => 0,
            'grand_total' => $subtotal,
            'payment_method' => $parsed['payment_method'],
            'paid_total' => $subtotal,
            'change_total' => 0,
            'match_notes' => array_values(array_unique($matchNotes)),
            'store_name' => '',
            'items' => $items->map(fn (array $item) => array_diff_key($item, ['cost_price' => true]))->all(),
            'items_with_cost' => $items->all(),
        ];
    }

    private function matchProduct(string $input, Collection $products): array
    {
        $needle = $this->normalizeProductName($input);
        $scored = $products->map(function (array $product) use ($needle, $input): array {
            $name = (string) ($product['name'] ?? '');
            $normalized = $this->normalizeProductName($name);
            $score = $this->similarityScore($needle, $normalized);

            return compact('product', 'name', 'score') + ['input' => $input];
        })->sortByDesc('score')->values();

        $best = $scored->first();
        $second = $scored->get(1);

        if (! $best || (float) $best['score'] < 0.35) {
            return [
                'status' => 'not_found',
                'message' => 'Produk \''.$input.'\' tidak ditemukan. Produk terdekat: '.$this->candidateList($scored).'.',
            ];
        }

        if ($second && (float) $best['score'] < 0.82 && ((float) $best['score'] - (float) $second['score']) < 0.12) {
            return [
                'status' => 'ambiguous',
                'message' => 'Produk \''.$input.'\' ambigu. Kandidat: '.$this->candidateList($scored).'. Tulis nama lebih lengkap.',
            ];
        }

        return [
            'status' => 'matched',
            'product' => $best['product'],
            'note' => $this->normalizeProductName($input) === $this->normalizeProductName((string) $best['name'])
                ? ''
                : 'Saya cocokkan \''.$input.'\' ke \''.$best['name'].'\'.',
        ];
    }

    private function similarityScore(string $needle, string $candidate): float
    {
        if ($needle === '' || $candidate === '') {
            return 0.0;
        }

        if ($needle === $candidate) {
            return 1.0;
        }

        if (str_contains($candidate, $needle) || str_contains($needle, $candidate)) {
            return 0.95;
        }

        similar_text($needle, $candidate, $percent);
        $levenshtein = levenshtein($needle, $candidate);
        $maxLength = max(strlen($needle), strlen($candidate), 1);
        $distanceScore = max(0, 1 - ($levenshtein / $maxLength));

        return max($percent / 100, $distanceScore);
    }

    private function normalizeProductName(string $value): string
    {
        $value = str($value)->lower()->ascii()->squish()->toString();
        $value = preg_replace('/[^a-z0-9 ]+/', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    private function candidateList(Collection $scored): string
    {
        $names = $scored->take(3)->pluck('name')->filter()->values();

        return $names->isEmpty() ? '-' : $names->map(fn ($name, $index) => ($index + 1).'. '.$name)->implode(', ');
    }

    private function confirm(string|int $chatId, string $tenantId, string $cashierId, array $link): string
    {
        $draft = Cache::pull($this->draftKey($chatId));

        if (! is_array($draft)) {
            return 'Tidak ada draft aktif. Kirim order dulu, contoh: kopi susu 1, americano 2, andi, cash';
        }

        $branchId = (int) ($draft['branch_id'] ?: ($link['store_id'] ?? 0));

        // Resolve branch
        $branch = Branch::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->when($branchId > 0, fn ($q) => $q->whereKey($branchId))
            ->orderBy('id')
            ->first();

        if (! $branch instanceof Branch) {
            throw new RuntimeException('Tidak ada cabang aktif yang tersedia untuk tenant ini.');
        }

        // Resolve warehouse
        $warehouse = Warehouse::query()
            ->where('tenant_id', $tenantId)
            ->where('branch_id', $branch->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        if (! $warehouse instanceof Warehouse) {
            throw new RuntimeException('Tidak ada gudang aktif untuk cabang '.$branch->name.'.');
        }

        $sale = DB::transaction(function () use ($tenantId, $cashierId, $draft, $branch, $warehouse): Sale {
            $itemsWithCost = $draft['items_with_cost'] ?? $draft['items'];
            $subtotal = 0.0;
            $costTotal = 0.0;
            $saleRows = [];

            foreach ($itemsWithCost as $item) {
                $product = Product::query()
                    ->where('tenant_id', $tenantId)
                    ->whereKey($item['id'])
                    ->firstOrFail();

                $qty = (float) $item['qty'];
                $unitPrice = (float) ($item['price'] ?? $product->selling_price);
                $unitCost = (float) ($item['cost_price'] ?? $product->cost_price);
                $lineTotal = round($qty * $unitPrice, 2);
                $lineCost = round($qty * $unitCost, 2);

                $stock = $product->stockOnHand($warehouse->id);
                if ($stock < $qty) {
                    throw new RuntimeException('Stok '.$product->name.' tidak cukup. Tersedia '.$stock.'.');
                }

                $subtotal += $lineTotal;
                $costTotal += $lineCost;
                $saleRows[] = compact('product', 'qty', 'unitPrice', 'unitCost', 'lineTotal', 'lineCost');
            }

            $paymentMethod = $draft['payment_method'] === 'bank' ? 'bank' : 'cash';

            /** @var Sale $sale */
            $sale = Sale::query()->create([
                'tenant_id' => $tenantId,
                'branch_id' => $branch->id,
                'warehouse_id' => $warehouse->id,
                'user_id' => $cashierId,
                'sale_number' => $draft['sale_number'],
                'sold_at' => now(),
                'payment_method' => $paymentMethod,
                'subtotal' => $subtotal,
                'discount_total' => 0,
                'tax_total' => 0,
                'grand_total' => $subtotal,
                'paid_total' => $subtotal,
                'change_total' => 0,
                'status' => 'paid',
            ]);

            foreach ($saleRows as $row) {
                /** @var Product $product */
                $product = $row['product'];
                $sale->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $row['qty'],
                    'unit_price' => $row['unitPrice'],
                    'unit_cost' => $row['unitCost'],
                    'discount_total' => 0,
                    'line_total' => $row['lineTotal'],
                    'cost_total' => $row['lineCost'],
                ]);

                InventoryMovement::query()->create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branch->id,
                    'warehouse_id' => $warehouse->id,
                    'product_id' => $product->id,
                    'movement_number' => 'STK-OUT-'.$draft['sale_number'].'-'.$product->id,
                    'movement_type' => 'pos_sale',
                    'movement_at' => now(),
                    'quantity_in' => 0,
                    'quantity_out' => $row['qty'],
                    'unit_cost' => $row['unitCost'],
                    'total_cost' => $row['lineCost'],
                    'source_type' => Sale::class,
                    'source_id' => $sale->id,
                    'notes' => 'Stok keluar dari Telegram POS',
                ]);
            }

            return $sale;
        });

        // Enqueue print job via BrowserPrintQueue
        $this->printQueue->enqueue(
            $tenantId,
            $this->receiptPayload($draft, $sale, $cashierId, $link),
            $draft['branch_id'] ?: null,
            'telegram',
        );

        return 'Transaksi berhasil disimpan: '.$draft['sale_number']
            ."\nTotal: Rp ".number_format((int) $draft['grand_total'], 0, ',', '.')
            ."\nStruk akan otomatis dicetak jika halaman POS browser sedang terbuka dan printer sudah connect.";
    }

    private function receiptPayload(array $draft, Sale $sale, string $cashierId, array $link): array
    {
        return [
            'id' => (string) $sale->id,
            'tenant_id' => (string) ($draft['tenant_id'] ?? ''),
            'tenant_name' => (string) ($draft['tenant_name'] ?? 'RangKayo Store'),
            'branch_id' => $draft['branch_id'] ?: null,
            'store_name' => (string) ($draft['store_name'] ?? ''),
            'cashier_id' => $cashierId,
            'cashier_name' => (string) ($draft['cashier_name'] ?? 'Kasir Telegram'),
            'customer_id' => $draft['customer_id'] ?: null,
            'customer_name' => (string) ($draft['customer_name'] ?: 'Walk-in Customer'),
            'sale_number' => (string) $sale->sale_number,
            'transaction_code' => (string) $sale->sale_number,
            'created_at' => $sale->sold_at?->toIso8601String() ?? now()->toIso8601String(),
            'subtotal' => (int) $draft['subtotal'],
            'discount' => 0,
            'tax' => 0,
            'total' => (int) $draft['grand_total'],
            'payment_method' => (string) $draft['payment_method'],
            'payment_amount' => (int) $draft['paid_total'],
            'change_amount' => 0,
            'notes' => 'Telegram POS'.($draft['customer_name'] ? ' - '.$draft['customer_name'] : ''),
            'items' => $draft['items'],
            'source' => 'telegram',
        ];
    }

    private function findContactId(string $tenantId, ?string $name): ?string
    {
        if (! $name) {
            return null;
        }

        return Contact::query()
            ->where('tenant_id', $tenantId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))])
            ->value('id');
    }

    private function formatDraft(array $draft): string
    {
        $lines = ['Konfirmasi transaksi '.$draft['sale_number'].':'];

        foreach ($draft['items'] as $item) {
            $lines[] = '- '.$item['name'].' x'.$item['qty'].' = Rp '.number_format((int) $item['subtotal'], 0, ',', '.');
        }

        $lines[] = 'Customer: '.($draft['customer_name'] ?: '-');
        $lines[] = 'Payment: '.strtoupper((string) $draft['payment_method']);
        $lines[] = 'Total: Rp '.number_format((int) $draft['grand_total'], 0, ',', '.');

        return implode("\n", $lines);
    }

    private function draftKey(string|int $chatId): string
    {
        return 'telegram-pos-draft:'.$chatId;
    }

    private function productsForTenant(string $tenantId): Collection
    {
        return Product::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get()
            ->map(fn (Product $product): array => [
                'id' => (string) $product->id,
                'name' => (string) $product->name,
                'selling_price' => (int) round((float) $product->selling_price),
                'cost_price' => (int) round((float) $product->cost_price),
                'stock' => (int) $product->stockOnHand(),
                'is_active' => (bool) $product->is_active,
            ]);
    }
}
