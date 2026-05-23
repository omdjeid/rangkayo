<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\PayInvoiceAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoicePaymentController extends Controller
{
    public function store(Request $request, CurrentTenant $currentTenant, PayInvoiceAction $payInvoice): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'invoice_id' => ['required', Rule::exists('invoices', 'id')->where('tenant_id', $tenant->id)],
            'cash_account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)],
            'payment_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $invoice = Invoice::query()->where('tenant_id', $tenant->id)->findOrFail($validated['invoice_id']);
        $cashAccount = Account::query()->where('tenant_id', $tenant->id)->findOrFail($validated['cash_account_id']);

        $payInvoice->handle(
            invoice: $invoice,
            cashAccount: $cashAccount,
            amount: (float) $validated['amount'],
            date: $validated['payment_date'],
            notes: $validated['notes'] ?? null,
        );

        return back()->with('success', 'Pembayaran invoice berhasil dicatat dan pembukuan otomatis dibuat.');
    }
}
