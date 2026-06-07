<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Warehouse;
use App\Support\CurrentTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockReportController extends Controller
{
    public function __invoke(Request $request, CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);
        $branchId = $context->isBranchScoped() ? $branch->id : ($request->integer('branch_id') ?: null);
        $warehouseId = $request->integer('warehouse_id') ?: null;
        $asOfDate = $request->date('as_of_date')?->toDateString() ?? now()->toDateString();

        $warehouseOptions = Warehouse::query()
            ->where('tenant_id', $tenant->id)
            ->when($branchId !== null, fn (Builder $query) => $query->where('branch_id', $branchId))
            ->orderBy('name')
            ->get(['id', 'branch_id', 'name', 'code']);

        if ($warehouseId !== null && ! $warehouseOptions->contains('id', $warehouseId)) {
            $warehouseId = null;
        }

        $movementSummary = InventoryMovement::query()
            ->select(
                'product_id',
                'warehouse_id',
                DB::raw('coalesce(sum(quantity_in), 0) as quantity_in'),
                DB::raw('coalesce(sum(quantity_out), 0) as quantity_out'),
                DB::raw('coalesce(sum(total_cost), 0) as total_cost')
            )
            ->where('tenant_id', $tenant->id)
            ->whereDate('movement_at', '<=', $asOfDate)
            ->when($branchId !== null, fn (Builder $query) => $query->where('branch_id', $branchId))
            ->when($warehouseId !== null, fn (Builder $query) => $query->where('warehouse_id', $warehouseId))
            ->groupBy('product_id', 'warehouse_id');

        $rows = Product::query()
            ->where('products.tenant_id', $tenant->id)
            ->where('products.is_active', true)
            ->whereDoesntHave('recipes')
            ->leftJoinSub($movementSummary, 'stock_summary', fn ($join) => $join->on('stock_summary.product_id', '=', 'products.id'))
            ->leftJoin('warehouses', 'warehouses.id', '=', 'stock_summary.warehouse_id')
            ->leftJoin('branches', 'branches.id', '=', 'warehouses.branch_id')
            ->leftJoin('units', 'units.id', '=', 'products.unit_id')
            ->select(
                'products.id',
                'products.sku',
                'products.name',
                'products.cost_price',
                'products.minimum_stock',
                'units.symbol as unit_symbol',
                'branches.name as branch_name',
                'warehouses.name as warehouse_name',
                DB::raw('coalesce(stock_summary.quantity_in, 0) as quantity_in'),
                DB::raw('coalesce(stock_summary.quantity_out, 0) as quantity_out'),
                DB::raw('coalesce(stock_summary.quantity_in, 0) - coalesce(stock_summary.quantity_out, 0) as stock_on_hand'),
                DB::raw('(coalesce(stock_summary.quantity_in, 0) - coalesce(stock_summary.quantity_out, 0)) * products.cost_price as stock_value')
            )
            ->orderBy('products.name')
            ->orderBy('branches.name')
            ->orderBy('warehouses.name')
            ->get()
            ->map(fn ($row): array => [
                'product_id' => $row->id,
                'sku' => $row->sku,
                'product' => $row->name,
                'unit' => $row->unit_symbol,
                'branch' => $row->branch_name ?? 'Belum ada pergerakan',
                'warehouse' => $row->warehouse_name ?? 'Belum ada pergerakan',
                'quantity_in' => (float) $row->quantity_in,
                'quantity_out' => (float) $row->quantity_out,
                'stock_on_hand' => (float) $row->stock_on_hand,
                'minimum_stock' => (float) $row->minimum_stock,
                'unit_cost' => (float) $row->cost_price,
                'stock_value' => (float) $row->stock_value,
                'status' => (float) $row->stock_on_hand <= 0 ? 'out' : ((float) $row->stock_on_hand <= (float) $row->minimum_stock ? 'low' : 'ok'),
            ])
            ->values();

        return Inertia::render('Reports/Stock/Index', [
            'filters' => [
                'branch_id' => $branchId,
                'warehouse_id' => $warehouseId,
                'as_of_date' => $asOfDate,
            ],
            'branches' => Branch::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'code']),
            'warehouses' => $warehouseOptions,
            'summary' => [
                'products' => $rows->count(),
                'stock_on_hand' => $rows->sum('stock_on_hand'),
                'stock_value' => $rows->sum('stock_value'),
                'low_stock' => $rows->whereIn('status', ['low', 'out'])->count(),
            ],
            'rows' => $rows,
            'isBranchScoped' => $context->isBranchScoped(),
        ]);
    }
}
