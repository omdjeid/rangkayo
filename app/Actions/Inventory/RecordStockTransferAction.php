<?php

namespace App\Actions\Inventory;

use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockTransfer;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordStockTransferAction
{
    public function createDraft(Tenant $tenant, Warehouse $fromWarehouse, Warehouse $toWarehouse, Product $product, float $quantity, ?float $unitCost = null, ?string $notes = null, ?User $requester = null): StockTransfer
    {
        $this->validateTransfer($tenant, $fromWarehouse, $toWarehouse, $product, $quantity);

        $unitCost ??= (float) $product->cost_price;
        $totalCost = round($quantity * $unitCost, 2);

        /** @var StockTransfer $transfer */
        $transfer = StockTransfer::query()->create([
            'tenant_id' => $tenant->id,
            'from_branch_id' => $fromWarehouse->branch_id,
            'to_branch_id' => $toWarehouse->branch_id,
            'from_warehouse_id' => $fromWarehouse->id,
            'to_warehouse_id' => $toWarehouse->id,
            'product_id' => $product->id,
            'requested_by' => $requester?->id,
            'transfer_number' => 'TRF-'.now()->format('YmdHis'),
            'status' => 'draft',
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'total_cost' => $totalCost,
            'requested_at' => now(),
            'notes' => $notes,
        ]);

        return $transfer->load(['product', 'fromWarehouse.branch', 'toWarehouse.branch', 'requester']);
    }

    public function approve(StockTransfer $transfer, User $approver): StockTransfer
    {
        if ($transfer->status !== 'draft') {
            throw new InvalidArgumentException('Hanya transfer draft yang bisa disetujui/dikirim.');
        }

        return DB::transaction(function () use ($transfer, $approver): StockTransfer {
            $locked = StockTransfer::query()->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== 'draft') {
                throw new InvalidArgumentException('Status transfer sudah berubah.');
            }

            $product = $locked->product()->lockForUpdate()->firstOrFail();
            $fromWarehouse = $locked->fromWarehouse()->firstOrFail();
            $stock = $product->stockOnHand($fromWarehouse->id);
            $quantity = (float) $locked->quantity;

            if ($stock < $quantity) {
                throw new InvalidArgumentException("Stok {$product->name} tidak cukup untuk transfer. Tersedia {$stock}.");
            }

            InventoryMovement::query()->create([
                'tenant_id' => $locked->tenant_id,
                'branch_id' => $locked->from_branch_id,
                'warehouse_id' => $locked->from_warehouse_id,
                'product_id' => $locked->product_id,
                'movement_number' => $locked->transfer_number.'-OUT',
                'movement_type' => 'stock_transfer_out',
                'movement_at' => now(),
                'quantity_in' => 0,
                'quantity_out' => $quantity,
                'unit_cost' => $locked->unit_cost,
                'total_cost' => $locked->total_cost,
                'source_type' => StockTransfer::class,
                'source_id' => $locked->id,
                'notes' => $locked->notes,
            ]);

            $locked->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            return $locked->fresh(['product', 'fromWarehouse.branch', 'toWarehouse.branch', 'requester', 'approver']);
        });
    }

    public function receive(StockTransfer $transfer, User $receiver): StockTransfer
    {
        if ($transfer->status !== 'approved') {
            throw new InvalidArgumentException('Hanya transfer terkirim yang bisa diterima.');
        }

        return DB::transaction(function () use ($transfer, $receiver): StockTransfer {
            $locked = StockTransfer::query()->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== 'approved') {
                throw new InvalidArgumentException('Status transfer sudah berubah.');
            }

            InventoryMovement::query()->create([
                'tenant_id' => $locked->tenant_id,
                'branch_id' => $locked->to_branch_id,
                'warehouse_id' => $locked->to_warehouse_id,
                'product_id' => $locked->product_id,
                'movement_number' => $locked->transfer_number.'-IN',
                'movement_type' => 'stock_transfer_in',
                'movement_at' => now(),
                'quantity_in' => $locked->quantity,
                'quantity_out' => 0,
                'unit_cost' => $locked->unit_cost,
                'total_cost' => $locked->total_cost,
                'source_type' => StockTransfer::class,
                'source_id' => $locked->id,
                'notes' => $locked->notes,
            ]);

            $locked->update([
                'status' => 'received',
                'received_by' => $receiver->id,
                'received_at' => now(),
            ]);

            return $locked->fresh(['product', 'fromWarehouse.branch', 'toWarehouse.branch', 'requester', 'approver', 'receiver']);
        });
    }

    /**
     * @return array{out:InventoryMovement, in:InventoryMovement}
     */
    public function handle(Tenant $tenant, Warehouse $fromWarehouse, Warehouse $toWarehouse, Product $product, float $quantity, ?float $unitCost = null, ?string $notes = null): array
    {
        $transfer = $this->createDraft($tenant, $fromWarehouse, $toWarehouse, $product, $quantity, $unitCost, $notes);
        $systemUser = User::query()->whereHas('tenants', fn ($query) => $query->whereKey($tenant->id))->first();

        if (! $systemUser instanceof User) {
            throw new InvalidArgumentException('User approval transfer tidak tersedia.');
        }

        $this->approve($transfer, $systemUser);
        $this->receive($transfer->fresh(), $systemUser);

        $movements = InventoryMovement::query()
            ->where('source_type', StockTransfer::class)
            ->where('source_id', $transfer->id)
            ->get()
            ->keyBy('movement_type');

        $out = $movements->get('stock_transfer_out');
        $in = $movements->get('stock_transfer_in');

        if (! $out instanceof InventoryMovement || ! $in instanceof InventoryMovement) {
            throw new InvalidArgumentException('Movement transfer stok tidak lengkap.');
        }

        return ['out' => $out, 'in' => $in];
    }

    private function validateTransfer(Tenant $tenant, Warehouse $fromWarehouse, Warehouse $toWarehouse, Product $product, float $quantity): void
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Jumlah transfer harus lebih dari nol.');
        }

        if ($fromWarehouse->tenant_id !== $tenant->id || $toWarehouse->tenant_id !== $tenant->id || $product->tenant_id !== $tenant->id) {
            throw new InvalidArgumentException('Data transfer tidak sesuai tenant.');
        }

        if (! $fromWarehouse->is_active || ! $toWarehouse->is_active) {
            throw new InvalidArgumentException('Gudang transfer harus aktif.');
        }

        if ($fromWarehouse->id === $toWarehouse->id) {
            throw new InvalidArgumentException('Gudang asal dan tujuan tidak boleh sama.');
        }
    }
}
