<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\TaxRate;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateInvoiceAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    /**
     * @param  array<int, array{account_id:int, description:string, quantity:float|int|string, unit_price:float|int|string, product_id?:int|null, warehouse_id?:int|null, tax_rate_id?:int|null}>  $items
     */
    public function handle(Tenant $tenant, ?Branch $branch, ?Contact $contact, string $type, string $date, ?string $dueDate, array $items, ?string $notes = null): Invoice
    {
        if (! in_array($type, ['sales', 'purchase'], true)) {
            throw new InvalidArgumentException('Invoice harus bertipe sales atau purchase.');
        }

        if ($items === []) {
            throw new InvalidArgumentException('Invoice membutuhkan minimal 1 item.');
        }

        $warehouses = $this->warehousesForItems($tenant, $branch, $items);
        $taxRates = $this->taxRatesForItems($tenant, $items);

        return DB::transaction(function () use ($tenant, $branch, $contact, $type, $date, $dueDate, $items, $notes, $warehouses, $taxRates): Invoice {
            $number = ($type === 'sales' ? 'INV-S' : 'INV-P').'-'.now()->format('YmdHis').'-'.str()->upper(str()->random(4));
            $preparedItems = collect($items)->map(function (array $item) use ($taxRates): array {
                $lineTotal = round((float) $item['quantity'] * (float) $item['unit_price'], 2);
                $taxRate = ! empty($item['tax_rate_id']) ? $taxRates->get((int) $item['tax_rate_id']) : null;
                $taxTotal = $taxRate instanceof TaxRate ? round($lineTotal * ((float) $taxRate->rate / 100), 2) : 0.0;

                return [...$item, 'line_total' => $lineTotal, 'tax_total' => $taxTotal];
            });
            $subtotal = (float) $preparedItems->sum('line_total');
            $taxTotal = (float) $preparedItems->sum('tax_total');
            $grandTotal = $subtotal + $taxTotal;
            $controlAccount = $this->account($tenant, $type === 'sales' ? '1030' : '2010');

            $journalLines = [];

            if ($type === 'sales') {
                $journalLines[] = ['account_id' => $controlAccount->id, 'debit' => $grandTotal, 'credit' => 0, 'description' => 'Piutang invoice'];
                foreach ($preparedItems as $item) {
                    $journalLines[] = ['account_id' => $item['account_id'], 'debit' => 0, 'credit' => $item['line_total'], 'description' => $item['description']];
                }
                $this->appendTaxLines($tenant, $journalLines, $preparedItems, debit: false, description: 'Pajak keluaran');
            } else {
                $inventoryAccount = $this->account($tenant, '1040');

                foreach ($preparedItems as $item) {
                    $journalLines[] = [
                        'account_id' => ! empty($item['product_id']) ? $inventoryAccount->id : $item['account_id'],
                        'debit' => $item['line_total'],
                        'credit' => 0,
                        'description' => $item['description'],
                    ];
                }
                $this->appendTaxLines($tenant, $journalLines, $preparedItems, debit: true, description: 'Pajak masukan');
                $journalLines[] = ['account_id' => $controlAccount->id, 'debit' => 0, 'credit' => $grandTotal, 'description' => 'Hutang invoice'];
            }

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $date,
                'source_type' => 'invoice',
                'description' => ($type === 'sales' ? 'Sales invoice ' : 'Purchase invoice ').$number,
            ], $journalLines);

            /** @var Invoice $invoice */
            $invoice = Invoice::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'contact_id' => $contact?->id,
                'journal_entry_id' => $journalEntry->id,
                'invoice_number' => $number,
                'type' => $type,
                'invoice_date' => $date,
                'due_date' => $dueDate,
                'subtotal' => $subtotal,
                'tax_total' => $taxTotal,
                'grand_total' => $grandTotal,
                'paid_total' => 0,
                'balance_due' => $grandTotal,
                'status' => 'open',
                'notes' => $notes,
            ]);

            foreach ($preparedItems as $item) {
                $quantity = (float) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];
                $invoiceItem = $invoice->items()->create([
                    'account_id' => $item['account_id'],
                    'product_id' => $item['product_id'] ?? null,
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                    'tax_rate_id' => $item['tax_rate_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $item['line_total'],
                    'tax_total' => $item['tax_total'],
                ]);

                if ($type === 'purchase' && ! empty($item['product_id'])) {
                    $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($item['product_id']);
                    $warehouse = $warehouses->get((int) ($item['warehouse_id'] ?? 0));

                    if (! $warehouse instanceof Warehouse) {
                        throw new InvalidArgumentException('Pilih gudang untuk item produk pembelian.');
                    }

                    InventoryMovement::query()->create([
                        'tenant_id' => $tenant->id,
                        'branch_id' => $warehouse->branch_id,
                        'warehouse_id' => $warehouse->id,
                        'product_id' => $product->id,
                        'journal_entry_id' => $journalEntry->id,
                        'movement_number' => 'PUR-'.$number.'-'.$invoiceItem->id,
                        'movement_type' => 'purchase',
                        'movement_at' => now(),
                        'quantity_in' => $quantity,
                        'quantity_out' => 0,
                        'unit_cost' => $unitPrice,
                        'total_cost' => round($quantity * $unitPrice, 2),
                        'source_type' => Invoice::class,
                        'source_id' => $invoice->id,
                        'notes' => 'Pembelian barang',
                    ]);
                }
            }

            return $invoice->load(['items.account', 'items.taxRate', 'journalEntry.lines.account', 'contact']);
        });
    }

    /**
     * @param  array<int, array{account_id:int, description:string, quantity:float|int|string, unit_price:float|int|string, product_id?:int|null, warehouse_id?:int|null, tax_rate_id?:int|null}>  $items
     * @return Collection<int, Warehouse>
     */
    private function warehousesForItems(Tenant $tenant, ?Branch $branch, array $items): Collection
    {
        $productLines = collect($items)
            ->filter(fn (array $item): bool => ! empty($item['product_id']))
            ->values();
        $warehouseIds = $productLines
            ->map(fn (array $item): ?int => ! empty($item['warehouse_id']) ? (int) $item['warehouse_id'] : null)
            ->filter()
            ->unique()
            ->values();

        $missingWarehouseCount = $productLines
            ->filter(fn (array $item): bool => empty($item['warehouse_id']))
            ->count();

        if ($missingWarehouseCount > 0) {
            throw new InvalidArgumentException('Setiap item produk pembelian wajib memilih gudang.');
        }

        if ($warehouseIds->isEmpty()) {
            return collect();
        }

        /** @var Collection<int, Warehouse> $warehouses */
        $warehouses = Warehouse::query()
            ->with('branch:id,tenant_id,is_active')
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereIn('id', $warehouseIds)
            ->get()
            ->keyBy('id');

        if ($warehouses->count() !== $warehouseIds->count()) {
            throw new InvalidArgumentException('Gudang pembelian tidak aktif atau tidak tersedia.');
        }

        $warehouses->each(function (Warehouse $warehouse) use ($branch): void {
            if ($warehouse->branch?->is_active !== true) {
                throw new InvalidArgumentException('Cabang gudang pembelian tidak aktif.');
            }

            if ($branch instanceof Branch && $warehouse->branch_id !== $branch->id) {
                throw new InvalidArgumentException('Gudang pembelian tidak sesuai cabang aktif.');
            }
        });

        return $warehouses;
    }

    /**
     * @param  array<int, array{tax_rate_id?:int|null}>  $items
     * @return Collection<int, TaxRate>
     */
    private function taxRatesForItems(Tenant $tenant, array $items): Collection
    {
        $taxRateIds = collect($items)
            ->map(fn (array $item): ?int => ! empty($item['tax_rate_id']) ? (int) $item['tax_rate_id'] : null)
            ->filter()
            ->unique()
            ->values();

        if ($taxRateIds->isEmpty()) {
            return collect();
        }

        /** @var Collection<int, TaxRate> $taxRates */
        $taxRates = TaxRate::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereIn('id', $taxRateIds)
            ->get()
            ->keyBy('id');

        if ($taxRates->count() !== $taxRateIds->count()) {
            throw new InvalidArgumentException('Tarif pajak tidak aktif atau tidak tersedia.');
        }

        return $taxRates;
    }

    /**
     * @param  array<int, array{account_id:int, debit:float|int, credit:float|int, description:string}>  $journalLines
     * @param  Collection<int, array{tax_rate_id?:int|null, tax_total:float|int|string}>  $preparedItems
     */
    private function appendTaxLines(Tenant $tenant, array &$journalLines, Collection $preparedItems, bool $debit, string $description): void
    {
        $taxGroups = $preparedItems
            ->filter(fn (array $item): bool => ! empty($item['tax_rate_id']) && (float) $item['tax_total'] > 0)
            ->groupBy(fn (array $item): int => (int) $item['tax_rate_id'])
            ->map(fn (Collection $items): float => round((float) $items->sum('tax_total'), 2));

        foreach ($taxGroups as $taxRateId => $amount) {
            $taxRate = TaxRate::query()->where('tenant_id', $tenant->id)->find((int) $taxRateId);
            $accountId = $debit ? $taxRate?->input_account_id : $taxRate?->account_id;
            $fallbackCode = $debit ? '1070' : '2020';
            $taxAccount = $accountId ? Account::query()->where('tenant_id', $tenant->id)->find($accountId) : null;
            $taxAccount ??= $this->account($tenant, $fallbackCode);

            $journalLines[] = [
                'account_id' => $taxAccount->id,
                'debit' => $debit ? $amount : 0,
                'credit' => $debit ? 0 : $amount,
                'description' => $description.' '.$taxRate?->code,
            ];
        }
    }

    private function account(Tenant $tenant, string $code): Account
    {
        $account = $tenant->accounts()->where('code', $code)->first();

        if (! $account instanceof Account) {
            throw new InvalidArgumentException("Akun {$code} belum tersedia.");
        }

        return $account;
    }
}
