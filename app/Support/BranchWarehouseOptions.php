<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\ValidationException;

class BranchWarehouseOptions
{
    /**
     * @return array<int, array{id:int, name:string, code:string|null}>
     */
    public static function branches(Tenant $tenant, TenantUserContext $context): array
    {
        return $tenant->branches()
            ->where('is_active', true)
            ->when($context->isBranchScoped(), fn ($query) => $query->whereIn('id', $context->branchIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Branch $branch): array => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id:int, branch_id:int|null, branch_name:string|null, name:string, code:string|null, is_default:bool}>
     */
    public static function warehouses(Tenant $tenant, TenantUserContext $context, ?int $branchId = null): array
    {
        return self::transactionWarehouseQuery($tenant, $context, $branchId)
            ->get(['id', 'branch_id', 'name', 'code', 'is_default'])
            ->map(fn (Warehouse $warehouse): array => [
                'id' => $warehouse->id,
                'branch_id' => $warehouse->branch_id,
                'branch_name' => $warehouse->branch?->name,
                'name' => $warehouse->name,
                'code' => $warehouse->code,
                'is_default' => $warehouse->is_default,
            ])
            ->values()
            ->all();
    }

    public static function defaultWarehouse(Tenant $tenant, TenantUserContext $context, ?int $warehouseId = null): Warehouse
    {
        if ($warehouseId !== null) {
            $warehouse = self::transactionWarehouseQuery($tenant, $context)
                ->whereKey($warehouseId)
                ->first();

            if ($warehouse instanceof Warehouse) {
                return $warehouse;
            }
        }

        $warehouse = self::transactionWarehouseQuery($tenant, $context)
            ->orderBy('branch_id')
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        if (! $warehouse instanceof Warehouse) {
            throw ValidationException::withMessages([
                'warehouse_id' => 'Belum ada gudang aktif yang bisa dipakai untuk transaksi.',
            ]);
        }

        return $warehouse;
    }

    public static function resolveWarehouse(Tenant $tenant, TenantUserContext $context, int $warehouseId): Warehouse
    {
        $warehouse = self::transactionWarehouseQuery($tenant, $context)
            ->whereKey($warehouseId)
            ->first();

        if (! $warehouse instanceof Warehouse) {
            throw ValidationException::withMessages([
                'warehouse_id' => 'Gudang tidak aktif atau tidak berada dalam akses cabang Anda.',
            ]);
        }

        return $warehouse;
    }

    /**
     * @return HasMany<Warehouse>
     */
    private static function transactionWarehouseQuery(Tenant $tenant, TenantUserContext $context, ?int $branchId = null): HasMany
    {
        return $tenant->warehouses()
            ->with('branch:id,name,code,is_active')
            ->where('is_active', true)
            ->whereNotNull('branch_id')
            ->whereHas('branch', fn (Builder $query) => $query->where('is_active', true))
            ->when($branchId !== null, fn (Builder $query) => $query->where('branch_id', $branchId))
            ->when(
                $context->branch instanceof Branch && (! $context->isBranchScoped() || count($context->branchIds) <= 1),
                fn (Builder $query) => $query->where('branch_id', $context->branch->id),
            )
            ->when($context->isBranchScoped(), fn (Builder $query) => $query->whereIn('branch_id', $context->branchIds))
            ->orderBy('name');
    }
}
