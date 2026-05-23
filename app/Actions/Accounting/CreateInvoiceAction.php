<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateInvoiceAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    /**
     * @param  array<int, array{account_id:int, description:string, quantity:float|int|string, unit_price:float|int|string, product_id?:int|null, warehouse_id?:int|null}>  $items
     */
    public function handle(Tenant $tenant, ?Branch $branch, ?Contact $contact, string $type, string $date, ?string $dueDate, array $items, ?string $notes = null): Invoice
    {
        if (! in_array($type, ['sales', 'purchase'], true)) {
            throw new InvalidArgumentException('Invoice harus bertipe sales atau purchase.');
        }

        if ($items === []) {
            throw new InvalidArgumentException('Invoice membutuhkan minimal 1 item.');
        }

        return DB::transaction(function () use ($tenant, $branch, $contact, $type, $date, $dueDate, $items, $notes): Invoice {
            $number = ($type === 'sales' ? 'INV-S' : 'INV-P').'-'.now()->format('YmdHis');
            $subtotal = collect($items)->sum(fn (array $item): float => round((float) $item['quantity'] * (float) $item['unit_price'], 2));
            $controlAccount = $this->account($tenant, $type === 'sales' ? '1030' : '2010');

            $journalLines = [];

            if ($type === 'sales') {
                $journalLines[] = ['account_id' => $controlAccount->id, 'debit' => $subtotal, 'credit' => 0, 'description' => 'Piutang invoice'];
                foreach ($items as $item) {
                    $journalLines[] = ['account_id' => $item['account_id'], 'debit' => 0, 'credit' => round((float) $item['quantity'] * (float) $item['unit_price'], 2), 'description' => $item['description']];
                }
            } else {
                $inventoryAccount = $this->account($tenant, '1040');

                foreach ($items as $item) {
                    $journalLines[] = [
                        'account_id' => ! empty($item['product_id']) ? $inventoryAccount->id : $item['account_id'],
                        'debit' => round((float) $item['quantity'] * (float) $item['unit_price'], 2),
                        'credit' => 0,
                        'description' => $item['description'],
                    ];
                }
                $journalLines[] = ['account_id' => $controlAccount->id, 'debit' => 0, 'credit' => $subtotal, 'description' => 'Hutang invoice'];
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
                'grand_total' => $subtotal,
                'paid_total' => 0,
                'balance_due' => $subtotal,
                'status' => 'open',
                'notes' => $notes,
            ]);

            foreach ($items as $item) {
                $quantity = (float) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];
                $invoiceItem = $invoice->items()->create([
                    'account_id' => $item['account_id'],
                    'product_id' => $item['product_id'] ?? null,
                    'warehouse_id' => $item['warehouse_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => round($quantity * $unitPrice, 2),
                ]);

                if ($type === 'purchase' && ! empty($item['product_id'])) {
                    $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($item['product_id']);
                    $warehouse = Warehouse::query()->where('tenant_id', $tenant->id)->findOrFail($item['warehouse_id'] ?? null);

                    if ($branch instanceof Branch && $warehouse->branch_id !== $branch->id) {
                        throw new InvalidArgumentException('Gudang pembelian tidak sesuai cabang aktif.');
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

            return $invoice->load(['items.account', 'journalEntry.lines.account', 'contact']);
        });
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
