<?php

namespace App\Actions\Inventory;

use App\Actions\Accounting\PostJournalEntryAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordStockInAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Tenant $tenant, Branch $branch, Warehouse $warehouse, Product $product, float $quantity, float $unitCost, string $paymentAccountCode = '1010'): InventoryMovement
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Quantity stok masuk harus lebih dari 0.');
        }

        if ($unitCost < 0) {
            throw new InvalidArgumentException('Harga modal tidak boleh negatif.');
        }

        return DB::transaction(function () use ($tenant, $branch, $warehouse, $product, $quantity, $unitCost, $paymentAccountCode): InventoryMovement {
            $totalCost = round($quantity * $unitCost, 2);
            $inventoryAccount = $this->account($tenant, '1040');
            $paymentAccount = $this->account($tenant, $paymentAccountCode);
            $number = 'STK-IN-'.now()->format('YmdHis');

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => today()->toDateString(),
                'source_type' => 'stock_in',
                'description' => "Stok masuk {$product->name}",
            ], [
                ['account_id' => $inventoryAccount->id, 'debit' => $totalCost, 'credit' => 0, 'description' => 'Persediaan bertambah'],
                ['account_id' => $paymentAccount->id, 'debit' => 0, 'credit' => $totalCost, 'description' => 'Pembayaran stok masuk'],
            ]);

            /** @var InventoryMovement $movement */
            $movement = InventoryMovement::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'warehouse_id' => $warehouse->id,
                'product_id' => $product->id,
                'journal_entry_id' => $journalEntry->id,
                'movement_number' => $number,
                'movement_type' => 'stock_in',
                'movement_at' => now(),
                'quantity_in' => $quantity,
                'quantity_out' => 0,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'source_type' => JournalEntry::class,
                'source_id' => $journalEntry->id,
                'notes' => 'Input stok masuk MVP',
            ]);

            return $movement->load(['product', 'warehouse', 'journalEntry.lines.account']);
        });
    }

    private function account(Tenant $tenant, string $code): Account
    {
        /** @var Account|null $account */
        $account = $tenant->accounts()->where('code', $code)->first();

        if (! $account instanceof Account) {
            throw new InvalidArgumentException("Akun {$code} belum tersedia.");
        }

        return $account;
    }
}
