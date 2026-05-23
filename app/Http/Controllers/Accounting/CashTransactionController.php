<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\RecordCashTransactionAction;
use App\Actions\Accounting\RecordCashTransferAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\CashTransaction;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CashTransactionController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/CashTransactions/Index', [
            'cashAccounts' => Account::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_cash', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
            'counterAccounts' => Account::query()
                ->where('tenant_id', $tenant->id)
                ->whereIn('type', ['asset', 'liability', 'equity', 'revenue', 'expense', 'contra_revenue'])
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type', 'is_cash']),
            'transactions' => CashTransaction::query()
                ->with(['cashAccount:id,code,name', 'counterAccount:id,code,name', 'branch:id,name'])
                ->where('tenant_id', $tenant->id)
                ->latest('transaction_date')
                ->latest('id')
                ->limit(80)
                ->get()
                ->map(fn (CashTransaction $transaction): array => [
                    'id' => $transaction->id,
                    'transaction_number' => $transaction->transaction_number,
                    'transaction_date' => $transaction->transaction_date?->toDateString(),
                    'type' => $transaction->type,
                    'amount' => (float) $transaction->amount,
                    'description' => $transaction->description,
                    'cash_account' => $transaction->cashAccount->code.' - '.$transaction->cashAccount->name,
                    'counter_account' => $transaction->counterAccount->code.' - '.$transaction->counterAccount->name,
                    'branch' => $transaction->branch?->name,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, RecordCashTransactionAction $recordCashTransaction, RecordCashTransferAction $recordCashTransfer): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);

        $validated = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense', 'transfer'])],
            'cash_account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)],
            'counter_account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id), 'different:cash_account_id'],
            'transaction_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $cashAccount = Account::query()->where('tenant_id', $tenant->id)->findOrFail($validated['cash_account_id']);
        $counterAccount = Account::query()->where('tenant_id', $tenant->id)->findOrFail($validated['counter_account_id']);

        if ($validated['type'] === 'transfer') {
            $recordCashTransfer->handle(
                tenant: $tenant,
                branch: $branch,
                fromAccount: $cashAccount,
                toAccount: $counterAccount,
                amount: (float) $validated['amount'],
                description: $validated['description'],
                date: $validated['transaction_date'],
            );

            return back()->with('success', 'Transfer kas/bank berhasil dicatat dan pembukuan otomatis dibuat.');
        }

        $recordCashTransaction->handle(
            tenant: $tenant,
            branch: $branch,
            cashAccount: $cashAccount,
            counterAccount: $counterAccount,
            type: $validated['type'],
            amount: (float) $validated['amount'],
            description: $validated['description'],
            date: $validated['transaction_date'],
        );

        return back()->with('success', 'Transaksi kas/bank berhasil dicatat dan pembukuan otomatis dibuat.');
    }
}
