<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\RecordStockInAction;
use App\Http\Controllers\Controller;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StockInController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);
        $warehouse = $currentTenant->warehouse($tenant, $branch);

        return Inertia::render('Inventory/StockIn/Index', [
            'branch' => $branch->only(['id', 'name', 'code']),
            'warehouse' => $warehouse->only(['id', 'name', 'code']),
            'products' => Product::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'sku', 'name', 'cost_price', 'selling_price']),
            'movements' => InventoryMovement::query()
                ->with(['product:id,name,sku', 'warehouse:id,name'])
                ->where('tenant_id', $tenant->id)
                ->where('movement_type', 'stock_in')
                ->latest('movement_at')
                ->limit(50)
                ->get()
                ->map(fn (InventoryMovement $movement): array => [
                    'id' => $movement->id,
                    'movement_number' => $movement->movement_number,
                    'movement_at' => $movement->movement_at?->toDateTimeString(),
                    'product' => $movement->product->name,
                    'warehouse' => $movement->warehouse->name,
                    'quantity_in' => (float) $movement->quantity_in,
                    'unit_cost' => (float) $movement->unit_cost,
                    'total_cost' => (float) $movement->total_cost,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, RecordStockInAction $recordStockIn): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);
        $warehouse = $currentTenant->warehouse($tenant, $branch);

        $validated = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'payment_account_code' => ['required', Rule::in(['1010', '1020', '2010'])],
        ]);

        $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($validated['product_id']);

        $recordStockIn->handle(
            tenant: $tenant,
            branch: $branch,
            warehouse: $warehouse,
            product: $product,
            quantity: (float) $validated['quantity'],
            unitCost: (float) $validated['unit_cost'],
            paymentAccountCode: $validated['payment_account_code'],
        );

        return back()->with('success', 'Stok masuk berhasil dicatat dan pembukuan otomatis dibuat.');
    }
}
