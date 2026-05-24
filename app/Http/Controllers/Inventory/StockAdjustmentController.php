<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\RecordStockAdjustmentAction;
use App\Http\Controllers\Controller;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Support\BranchWarehouseOptions;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function index(Request $request, CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $warehouse = BranchWarehouseOptions::defaultWarehouse($tenant, $context, $request->integer('warehouse_id') ?: null);
        $branch = $currentTenant->branch($tenant, branchId: (int) $warehouse->branch_id);

        return Inertia::render('Inventory/StockAdjustments/Index', [
            'branch' => $branch->only(['id', 'name', 'code']),
            'warehouse' => $warehouse->only(['id', 'name', 'code']),
            'warehouses' => BranchWarehouseOptions::warehouses($tenant, $context),
            'products' => Product::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'sku', 'name', 'cost_price']),
            'adjustments' => InventoryMovement::query()
                ->with('product:id,name,sku')
                ->where('tenant_id', $tenant->id)
                ->where('movement_type', 'stock_adjustment')
                ->latest('movement_at')
                ->limit(50)
                ->get()
                ->map(fn (InventoryMovement $movement): array => [
                    'id' => $movement->id,
                    'movement_number' => $movement->movement_number,
                    'product' => $movement->product->name,
                    'quantity_in' => (float) $movement->quantity_in,
                    'quantity_out' => (float) $movement->quantity_out,
                    'unit_cost' => (float) $movement->unit_cost,
                    'total_cost' => (float) $movement->total_cost,
                    'notes' => $movement->notes,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, RecordStockAdjustmentAction $adjustment): RedirectResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer'],
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'quantity_delta' => ['required', 'numeric', 'not_in:0'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $warehouse = BranchWarehouseOptions::resolveWarehouse($tenant, $context, (int) $validated['warehouse_id']);
        $branch = $currentTenant->branch($tenant, branchId: (int) $warehouse->branch_id);
        $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($validated['product_id']);

        $adjustment->handle($tenant, $branch, $warehouse, $product, (float) $validated['quantity_delta'], (float) $validated['unit_cost'], $validated['reason']);

        return back()->with('success', 'Penyesuaian stok berhasil disimpan.');
    }
}
