<?php

namespace App\Http\Controllers;

use App\Actions\Sales\CheckoutPosSaleAction;
use App\Models\Inventory\Product;
use App\Models\Sales\CashierShift;
use App\Models\Sales\Sale;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);
        $warehouse = $currentTenant->warehouse($tenant, $branch);

        $openShift = request()->user() instanceof User
            ? CashierShift::query()
                ->where('tenant_id', $tenant->id)
                ->where('user_id', request()->user()->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first()
            : null;

        return Inertia::render('POS/Index', [
            'mode' => $context->isCashierOnly() ? 'cashier' : 'admin',
            'openShift' => $openShift instanceof CashierShift ? [
                'id' => $openShift->id,
                'opened_at' => $openShift->opened_at?->toDateTimeString(),
                'opening_cash' => (float) $openShift->opening_cash,
                'expected_cash' => (float) $openShift->expected_cash,
            ] : null,
            'branch' => $branch->only(['id', 'name', 'code']),
            'warehouse' => $warehouse->only(['id', 'name', 'code']),
            'products' => Product::query()
                ->with('unit:id,symbol')
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product): array => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'unit' => $product->unit?->symbol,
                    'selling_price' => (float) $product->selling_price,
                    'cost_price' => (float) $product->cost_price,
                    'stock' => $product->stockOnHand($warehouse->id),
                ])->values(),
            'recentSales' => Sale::query()
                ->where('tenant_id', $tenant->id)
                ->where('branch_id', $branch->id)
                ->latest('sold_at')
                ->limit(8)
                ->get(['id', 'sale_number', 'sold_at', 'payment_method', 'grand_total']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, CheckoutPosSaleAction $checkout): RedirectResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);
        $warehouse = $currentTenant->warehouse($tenant, $branch);

        $openShift = $request->user() instanceof User
            ? CashierShift::query()
                ->where('tenant_id', $tenant->id)
                ->where('user_id', $request->user()->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first()
            : null;

        if ($context->isCashierOnly() && ! $openShift instanceof CashierShift) {
            return back()->withErrors(['shift' => 'Buka shift kasir sebelum transaksi.']);
        }

        $validated = $request->validate([
            'payment_method' => ['required', Rule::in(['cash', 'bank'])],
            'paid_total' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
        ]);

        $sale = $checkout->handle(
            tenant: $tenant,
            branch: $branch,
            warehouse: $warehouse,
            items: $validated['items'],
            paymentMethod: $validated['payment_method'],
            paidTotal: isset($validated['paid_total']) ? (float) $validated['paid_total'] : null,
            cashier: $request->user() instanceof User ? $request->user() : null,
            shift: $openShift,
        );

        return back()
            ->with('success', 'Transaksi berhasil disimpan. Stok dan pembukuan sudah diperbarui.')
            ->with('receipt_url', route('pos.receipt', $sale));
    }
}
