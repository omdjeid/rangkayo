<?php

namespace App\Http\Controllers\Api;

use App\Models\Sales\Sale;
use App\Actions\Sales\CheckoutPosSaleAction;
use App\Models\Warehouse;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SaleController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $context = $this->tenant($request);
        $query = Sale::where('tenant_id', $context->tenant->id)
            ->latest('sold_at');

        if ($request->filled('start_date')) {
            $query->whereDate('sold_at', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('sold_at', '<=', $request->input('end_date'));
        }

        $sales = $query->paginate($request->integer('per_page', 25));
        return $this->paginated($sales);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $context = $this->tenant($request);
        if ($sale->tenant_id !== $context->tenant->id) {
            return $this->error('Sale not found', 404);
        }
        $sale->load(['items', 'branch', 'user']);
        return $this->success($sale);
    }

    public function store(Request $request, CheckoutPosSaleAction $checkout): JsonResponse
    {
        $context = $this->tenant($request);
        $tenant = $context->tenant;

        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer'],
            'payment_method' => ['required', Rule::in(['cash', 'bank', 'qris'])],
            'paid_total' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
        ]);

        $warehouse = Warehouse::findOrFail($validated['warehouse_id']);
        $branch = Branch::findOrFail($warehouse->branch_id);
        $user = $request->user();

        $sale = $checkout->handle(
            tenant: $tenant,
            branch: $branch,
            warehouse: $warehouse,
            items: $validated['items'],
            paymentMethod: $validated['payment_method'],
            paidTotal: isset($validated['paid_total']) ? (float) $validated['paid_total'] : null,
            cashier: $user instanceof User ? $user : null,
            shift: null,
        );

        return $this->success([
            'id' => $sale->id,
            'sale_number' => $sale->sale_number,
            'grand_total' => (float) $sale->grand_total,
            'receipt_url' => route('pos.receipt', $sale),
        ], 'Sale created', 201);
    }
}
