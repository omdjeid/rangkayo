<?php

namespace App\Actions\Inventory;

use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordStockTransferAction
{
    /**
     * @return array{out:InventoryMovement, in:InventoryMovement}
     */
    public function handle(Tenant $tenant, Warehouse $fromWarehouse, Warehouse $toWarehouse, Product $product, float $quantity, ?float $unitCost = null, ?string $notes = null): array
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Jumlah transfer harus lebih dari nol.');
        }

        if ($fromWarehouse->tenant_id !== $tenant->id || $toWarehouse->tenant_id !== $tenant->id || $product->tenant_id !== $tenant->id) {
            throw new InvalidArgumentException('Data transfer tidak sesuai tenant.');
        }

        if ($fromWarehouse->id === $toWarehouse->id) {
            throw new InvalidArgumentException('Gudang asal dan tujuan tidak boleh sama.');
        }

        $stock = $product->stockOnHand($fromWarehouse->id);

        if ($stock < $quantity) {
            throw new InvalidArgumentException("Stok {$product->name} tidak cukup untuk transfer. Tersedia {$stock}.");
        }

        return DB::transaction(function () use ($tenant, $fromWarehouse, $toWarehouse, $product, $quantity, $unitCost, $notes): array {
            $number = 'TRF-'.now()->format('YmdHis');
            $unitCost ??= (float) $product->cost_price;
            $totalCost = round($quantity * $unitCost, 2);

            /** @var InventoryMovement $out */
            $out = InventoryMovement::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $fromWarehouse->branch_id,
                'warehouse_id' => $fromWarehouse->id,
                'product_id' => $product->id,
                'movement_number' => $number.'-OUT',
                'movement_type' => 'stock_transfer_out',
                'movement_at' => now(),
                'quantity_in' => 0,
                'quantity_out' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'source_type' => self::class,
                'notes' => $notes,
            ]);

            /** @var InventoryMovement $in */
            $in = InventoryMovement::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $toWarehouse->branch_id,
                'warehouse_id' => $toWarehouse->id,
                'product_id' => $product->id,
                'movement_number' => $number.'-IN',
                'movement_type' => 'stock_transfer_in',
                'movement_at' => now(),
                'quantity_in' => $quantity,
                'quantity_out' => 0,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'source_type' => self::class,
                'source_id' => $out->id,
                'notes' => $notes,
            ]);

            $out->update(['source_id' => $in->id]);

            return ['out' => $out->fresh(), 'in' => $in->fresh()];
        });
    }
}
