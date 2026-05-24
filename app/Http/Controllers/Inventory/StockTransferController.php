<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\RecordStockTransferAction;
use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockTransfer;
use App\Models\User;
use App\Support\BranchWarehouseOptions;
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
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);

        return Inertia::render('Inventory/StockTransfers/Index', [
            'currentBranch' => $branch->only(['id', 'name', 'code']),
            'warehouses' => BranchWarehouseOptions::warehouses($tenant, $context),
            'products' => Product::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'cost_price']),
            'transfers' => StockTransfer::query()
                ->with(['product:id,name,sku', 'fromWarehouse:id,name', 'toWarehouse:id,name', 'requester:id,name', 'approver:id,name', 'receiver:id,name'])
                ->where('tenant_id', $tenant->id)
                ->latest('requested_at')
                ->limit(50)
                ->get()
                ->map(fn (StockTransfer $transfer): array => [
                    'id' => $transfer->id,
                    'transfer_number' => $transfer->transfer_number,
                    'status' => $transfer->status,
                    'product' => $transfer->product->name,
                    'from_warehouse' => $transfer->fromWarehouse->name,
                    'to_warehouse' => $transfer->toWarehouse->name,
                    'quantity' => (float) $transfer->quantity,
                    'total_cost' => (float) $transfer->total_cost,
                    'requested_at' => $transfer->requested_at?->toDateTimeString(),
                    'approved_at' => $transfer->approved_at?->toDateTimeString(),
                    'received_at' => $transfer->received_at?->toDateTimeString(),
                    'requested_by' => $transfer->requester?->name,
                    'approved_by' => $transfer->approver?->name,
                    'received_by' => $transfer->receiver?->name,
                    'notes' => $transfer->notes,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, RecordStockTransferAction $transferAction): RedirectResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $validated = $request->validate([
            'from_warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('tenant_id', $tenant->id)],
            'to_warehouse_id' => ['required', 'different:from_warehouse_id', Rule::exists('warehouses', 'id')->where('tenant_id', $tenant->id)],
            'product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $from = BranchWarehouseOptions::resolveWarehouse($tenant, $context, (int) $validated['from_warehouse_id']);
        $to = BranchWarehouseOptions::resolveWarehouse($tenant, $context, (int) $validated['to_warehouse_id']);
        $product = Product::query()->where('tenant_id', $tenant->id)->findOrFail($validated['product_id']);

        $user = $request->user();
        abort_unless($user instanceof User, 403);

        $transferAction->createDraft($tenant, $from, $to, $product, (float) $validated['quantity'], isset($validated['unit_cost']) ? (float) $validated['unit_cost'] : null, $validated['notes'] ?? null, $user);

        return back()->with('success', 'Draft transfer stok berhasil dibuat. Setujui/kirim saat barang siap dipindahkan.');
    }

    public function approve(StockTransfer $stockTransfer, Request $request, CurrentTenant $currentTenant, RecordStockTransferAction $transferAction): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        abort_unless($stockTransfer->tenant_id === $tenant->id, 404);
        abort_unless($request->user() instanceof User, 403);

        $transferAction->approve($stockTransfer, $request->user());

        return back()->with('success', 'Transfer stok disetujui dan stok asal sudah dikirim.');
    }

    public function receive(StockTransfer $stockTransfer, Request $request, CurrentTenant $currentTenant, RecordStockTransferAction $transferAction): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        abort_unless($stockTransfer->tenant_id === $tenant->id, 404);
        abort_unless($request->user() instanceof User, 403);

        $transferAction->receive($stockTransfer, $request->user());

        return back()->with('success', 'Transfer stok diterima dan stok tujuan sudah bertambah.');
    }
}
