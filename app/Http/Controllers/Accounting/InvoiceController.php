<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\CreateInvoiceAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Contact;
use App\Models\Inventory\Product;
use App\Models\Warehouse;
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
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);

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
                    'grand_total' => (float) $invoice->grand_total,
                    'paid_total' => (float) $invoice->paid_total,
                    'balance_due' => (float) $invoice->balance_due,
                    'status' => $invoice->status,
                ])->values(),
            'contacts' => Contact::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'type']),
            'accounts' => Account::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'products' => Product::query()->where('tenant_id', $tenant->id)->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'cost_price']),
            'warehouses' => Warehouse::query()->where('tenant_id', $tenant->id)->where('branch_id', $branch->id)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, CreateInvoiceAction $createInvoice): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);

        $validated = $request->validate([
            'type' => ['required', Rule::in(['sales', 'purchase'])],
            'contact_id' => ['nullable', Rule::exists('contacts', 'id')->where('tenant_id', $tenant->id)],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)],
            'items.*.product_id' => ['nullable', Rule::exists('products', 'id')->where('tenant_id', $tenant->id)],
            'items.*.warehouse_id' => ['nullable', Rule::exists('warehouses', 'id')->where('tenant_id', $tenant->id)],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $contact = isset($validated['contact_id']) ? Contact::query()->where('tenant_id', $tenant->id)->find($validated['contact_id']) : null;

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
}
