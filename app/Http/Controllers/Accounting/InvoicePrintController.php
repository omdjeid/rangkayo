<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Accounting\Invoice;
use App\Support\CurrentTenant;
use App\Support\PrintPreferences;
use Inertia\Inertia;
use Inertia\Response;

class InvoicePrintController extends Controller
{
    public function __invoke(Invoice $invoice, CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        abort_unless($invoice->tenant_id === $tenant->id, 404);

        $invoice->load(['contact', 'branch', 'items.account', 'items.product', 'items.taxRate']);

        return Inertia::render('Accounting/Invoices/Print', [
            'tenant' => $tenant->only(['name', 'legal_name', 'tax_number', 'currency_code']),
            'printPreference' => PrintPreferences::forTenant($tenant)['invoice'],
            'invoice' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'type' => $invoice->type,
                'invoice_date' => $invoice->invoice_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'subtotal' => (float) $invoice->subtotal,
                'tax_total' => (float) $invoice->tax_total,
                'grand_total' => (float) $invoice->grand_total,
                'paid_total' => (float) $invoice->paid_total,
                'balance_due' => (float) $invoice->balance_due,
                'status' => $invoice->status,
                'notes' => $invoice->notes,
                'branch' => [
                    'name' => $invoice->branch?->name,
                    'phone' => $invoice->branch?->phone,
                    'address' => $invoice->branch?->address,
                ],
                'contact' => [
                    'name' => $invoice->contact?->name,
                    'email' => $invoice->contact?->email,
                    'phone' => $invoice->contact?->phone,
                    'address' => $invoice->contact?->address,
                ],
                'items' => $invoice->items->map(fn ($item): array => [
                    'description' => $item->description,
                    'account' => $item->account?->code.' - '.$item->account?->name,
                    'product' => $item->product?->name,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'tax_total' => (float) $item->tax_total,
                    'tax' => $item->taxRate?->name,
                ])->values(),
            ],
        ]);
    }
}
