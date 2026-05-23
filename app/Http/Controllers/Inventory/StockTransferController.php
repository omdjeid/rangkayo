<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\RecordStockTransferAction;
use App\Http\Controllers\Controller;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Warehouse;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);

        return Inertia::render('Inventory/StockTransfers/Index', [
            'currentBranch' => $branch->only(['id', 'name', 'code']),
            'warehouses' => Warehouse::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'branch_id', 'name', 'code']),
            'products' => Product::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'cost_price']),
            'transfers' => InventoryMovement::query()
                ->with(['product:id,name,sku', 'warehouse:id,name'])
                ->where('tenant_id', $tenant->id)
                ->where('movement_type', 'stock_transfer_out')
                ->latest('movement_at')
                ->limit(50)
                ->get()
                ->map(fn (InventoryMovement $movement): array => [
                    'id' => $movement->id,
                    'movement_number' => $movement->movement_number,
                    'product' => $movement->product->name,
                    'warehouse' => $movement->warehouse->name,
                    'quantity_out' => (float) $movement->quantity_out,
                    'total_cost' => (float) $movement->total_cost,
                    'notes' => $movement->notes,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, RecordStockTransferAction $transfer): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'from_warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('tenant_id', $tenant->id)],
            'to_warehouse_id' => ['required', 'different:from_warehouse_id', Rule::exists('warehouses', 'id')->where('tenant_id', $tenant->id)],
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $from = Warehouse::query()->where('tenant_id', $tenant->id)->findOrFail($validated['from_warehouse_id']);
        $to = Warehouse::query()->where('tenant_id', $tenant->id)->findOrFail($validated['to_warehouse_id']);
        $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($validated['product_id']);

        $transfer->handle($tenant, $from, $to, $product, (float) $validated['quantity'], isset($validated['unit_cost']) ? (float) $validated['unit_cost'] : null, $validated['notes'] ?? null);

        return back()->with('success', 'Transfer stok berhasil disimpan.');
    }
}
