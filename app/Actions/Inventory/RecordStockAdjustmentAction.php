<?php

namespace App\Actions\Inventory;

use App\Actions\Accounting\PostJournalEntryAction;
use App\Models\Accounting\Account;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordStockAdjustmentAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Tenant $tenant, Branch $branch, Warehouse $warehouse, Product $product, float $quantityDelta, float $unitCost, string $reason): InventoryMovement
    {
        if ($quantityDelta == 0.0) {
            throw new InvalidArgumentException('Perubahan stok tidak boleh nol.');
        }

        if ($branch->tenant_id !== $tenant->id || $warehouse->tenant_id !== $tenant->id || $product->tenant_id !== $tenant->id) {
            throw new InvalidArgumentException('Data stok tidak sesuai tenant.');
        }

        return DB::transaction(function () use ($tenant, $branch, $warehouse, $product, $quantityDelta, $unitCost, $reason): InventoryMovement {
            $number = 'ADJ-'.now()->format('YmdHis');
            $totalCost = round(abs($quantityDelta) * $unitCost, 2);
            $inventoryAccount = $this->account($tenant, '1040');
            $adjustmentAccount = $this->account($tenant, $quantityDelta > 0 ? '7010' : '6010');

            $journalLines = $quantityDelta > 0
                ? [
                    ['account_id' => $inventoryAccount->id, 'debit' => $totalCost, 'credit' => 0, 'description' => 'Penyesuaian stok masuk'],
                    ['account_id' => $adjustmentAccount->id, 'debit' => 0, 'credit' => $totalCost, 'description' => 'Selisih stok lebih'],
                ]
                : [
                    ['account_id' => $adjustmentAccount->id, 'debit' => $totalCost, 'credit' => 0, 'description' => 'Selisih stok kurang'],
                    ['account_id' => $inventoryAccount->id, 'debit' => 0, 'credit' => $totalCost, 'description' => 'Penyesuaian stok keluar'],
                ];

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => today()->toDateString(),
                'source_type' => 'stock_adjustment',
                'description' => 'Penyesuaian stok '.$product->name,
            ], $journalLines);

            /** @var InventoryMovement $movement */
            $movement = InventoryMovement::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'warehouse_id' => $warehouse->id,
                'product_id' => $product->id,
                'journal_entry_id' => $journalEntry->id,
                'movement_number' => $number,
                'movement_type' => 'stock_adjustment',
                'movement_at' => now(),
                'quantity_in' => max($quantityDelta, 0),
                'quantity_out' => abs(min($quantityDelta, 0)),
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'source_type' => self::class,
                'notes' => $reason,
            ]);

            return $movement;
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
