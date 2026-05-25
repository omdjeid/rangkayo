<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\CreateInvoiceAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\TaxRate;
use App\Models\Contact;
use App\Models\Inventory\Product;
use App\Support\BranchWarehouseOptions;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        return Inertia::render('Accounting/Invoices/Index', [
            'invoices' => Invoice::query()
                ->with('contact:id,name,type')
                ->where('tenant_id', $tenant->id)
                ->latest('invoice_date')
                ->latest('id')
                ->get()
                ->map(fn (Invoice $invoice): array => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'type' => $invoice->type,
                    'invoice_date' => $invoice->invoice_date?->toDateString(),
                    'due_date' => $invoice->due_date?->toDateString(),
                    'contact' => $invoice->contact?->name,
                    'subtotal' => (float) $invoice->subtotal,
                    'tax_total' => (float) $invoice->tax_total,
                    'grand_total' => (float) $invoice->grand_total,
                    'paid_total' => (float) $invoice->paid_total,
                    'balance_due' => (float) $invoice->balance_due,
                    'status' => $invoice->status,
                ])->values(),
            'contacts' => Contact::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'type']),
            'accounts' => Account::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'products' => Product::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'cost_price']),
            'warehouses' => BranchWarehouseOptions::warehouses($tenant, $context),
            'taxRates' => TaxRate::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'rate', 'is_default']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, CreateInvoiceAction $createInvoice): RedirectResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $validated = $request->validate([
            'type' => ['required', Rule::in(['sales', 'purchase'])],
            'contact_id' => ['nullable', Rule::exists('contacts', 'id')->where('tenant_id', $tenant->id)],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)->where('is_active', true)],
            'items.*.product_id' => ['nullable', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'items.*.warehouse_id' => ['nullable', 'integer'],
            'items.*.tax_rate_id' => ['nullable', Rule::exists('tax_rates', 'id')->where('tenant_id', $tenant->id)->where('is_active', true)],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $this->ensureItemAccountsAllowed($tenant->id, $validated['type'], $validated['items']);

        $contact = isset($validated['contact_id']) ? Contact::query()->where('tenant_id', $tenant->id)->find($validated['contact_id']) : null;
        $firstWarehouseId = collect($validated['items'])
            ->first(fn (array $item): bool => ! empty($item['warehouse_id']))['warehouse_id'] ?? null;
        $branch = null;

        if ($firstWarehouseId !== null) {
            $warehouse = BranchWarehouseOptions::resolveWarehouse($tenant, $context, (int) $firstWarehouseId);
            $branch = $currentTenant->branch($tenant, branchId: (int) $warehouse->branch_id);
        } elseif ($context->branch !== null) {
            $branch = $context->branch;
        }

        $createInvoice->handle(
            tenant: $tenant,
            branch: $branch,
            contact: $contact,
            type: $validated['type'],
            date: $validated['invoice_date'],
            dueDate: $validated['due_date'] ?? null,
            items: $validated['items'],
            notes: $validated['notes'] ?? null,
        );

        return back()->with('success', 'Invoice berhasil disimpan. Pembukuan sudah diperbarui.');
    }

    /**
     * @param  array<int, array{account_id:int|string}>  $items
     */
    private function ensureItemAccountsAllowed(int $tenantId, string $type, array $items): void
    {
        $accountIds = collect($items)->pluck('account_id')->map(fn ($id): int => (int) $id)->unique()->values();
        $allowedTypes = $type === 'sales' ? ['revenue'] : ['expense', 'asset'];
        $accounts = Account::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $accountIds)
            ->get(['id', 'type', 'is_cash']);

        $validCount = $accounts
            ->filter(fn (Account $account): bool => ! $account->is_cash && in_array($account->type, $allowedTypes, true))
            ->count();

        abort_unless($validCount === $accountIds->count(), 422, $type === 'sales'
            ? 'Invoice penjualan hanya boleh memakai akun pendapatan non-kas.'
            : 'Invoice pembelian hanya boleh memakai akun beban/aset non-kas.');
    }
}
