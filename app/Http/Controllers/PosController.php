<?php





namespace App\Http\Controllers;





use App\Actions\Sales\CheckoutPosSaleAction;


use App\Support\Printing\BrowserPrintQueue;


use App\Models\Contact;
use App\Models\CustomerOverride;
use App\Models\Inventory\Product;


use App\Models\Sales\CashierShift;


use App\Models\Sales\Sale;


use App\Models\User;


use App\Support\BranchWarehouseOptions;


use App\Support\CurrentTenant;


use Illuminate\Http\RedirectResponse;


use Illuminate\Http\Request;


use Illuminate\Support\Facades\Redirect;


use Illuminate\Validation\Rule;


use Inertia\Inertia;


use Inertia\Response;





class PosController extends Controller


{


    public function index(Request $request, CurrentTenant $currentTenant): Response


    {


        $context = $currentTenant->context();


        $tenant = $context->tenant;


        $warehouse = BranchWarehouseOptions::defaultWarehouse($tenant, $context, $request->integer('warehouse_id') ?: null);


        $branch = $currentTenant->branch($tenant, branchId: (int) $warehouse->branch_id);


        $warehouses = BranchWarehouseOptions::warehouses($tenant, $context);





        $openShift = $request->user() instanceof User


            ? CashierShift::query()


                ->where('tenant_id', $tenant->id)


                ->where('user_id', $request->user()->id)


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


            'warehouses' => $warehouses,


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


                    'wholesale_price' => (float) $product->wholesale_price,


                    'cost_price' => (float) $product->cost_price,


                    'stock' => $product->stockOnHand($warehouse->id),


                ])->values(),


            'qris' => [


                'merchant_name' => data_get($tenant->settings, 'payment.qris.merchant_name', ''),


                'qris_string' => data_get($tenant->settings, 'payment.qris.manual_qris_string', ''),


                'image_url' => data_get($tenant->settings, 'payment.qris.image_url', ''),


                'status' => data_get($tenant->settings, 'payment.qris.status', ''),


            ],


            'customers' => \App\Models\Contact::query()->where('tenant_id', $tenant->id)->where('type', 'customer')->get(['id', 'name', 'price_level'])->map(fn ($c): array => ['id' => $c->id, 'name' => $c->name, 'price_level' => $c->price_level])->values(),
            'overrides' => \App\Models\CustomerOverride::query()->where('tenant_id', $tenant->id)->get(['contact_id', 'product_id', 'price'])->map(fn ($o): array => ['contact_id' => (int) $o->contact_id, 'product_id' => (int) $o->product_id, 'price' => (float) $o->price])->values(),
            'recentSales' => Sale::query()


                ->where('tenant_id', $tenant->id)


                ->where('branch_id', $branch->id)


                ->latest('sold_at')


                ->limit(8)


                ->get(['id', 'sale_number', 'sold_at', 'payment_method', 'grand_total']),


        ]);


    }





    public function store(Request $request, CurrentTenant $currentTenant, CheckoutPosSaleAction $checkout, BrowserPrintQueue $printQueue): \Illuminate\Http\JsonResponse|RedirectResponse


    {


        $context = $currentTenant->context();


        $tenant = $context->tenant;





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


            'warehouse_id' => ['required', 'integer'],


            'payment_method' => ['required', Rule::in(['cash', 'bank', 'qris'])],


            'paid_total' => ['nullable', 'numeric', 'min:0'],


            'items' => ['required', 'array', 'min:1'],


            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],


            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],


        ]);





        $warehouse = BranchWarehouseOptions::resolveWarehouse($tenant, $context, (int) $validated['warehouse_id']);


        $branch = $currentTenant->branch($tenant, branchId: (int) $warehouse->branch_id);





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





        // Enqueue print job for browser auto-print


        $printQueue->pushReceipt($sale);





        if ($request->expectsJson()) {


            return response()->json([


                'success' => true,


                'message' => 'Transaksi berhasil.',


                'sale' => [


                    'id' => $sale->id,


                    'sale_number' => $sale->sale_number,


                    'grand_total' => (float) $sale->grand_total,


                ],


                'receipt_url' => route('pos.receipt', $sale),


            ]);


        }





        return Redirect::route('pos.index', ['warehouse_id' => $warehouse->id])


            ->with('success', 'Transaksi berhasil disimpan. Stok dan pembukuan sudah diperbarui.')


            ->with('receipt_url', route('pos.receipt', $sale));


    }


}