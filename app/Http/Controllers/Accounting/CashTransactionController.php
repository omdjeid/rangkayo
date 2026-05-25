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
                ->where('is_cash', false)
                ->whereIn('type', ['asset', 'liability', 'equity', 'revenue', 'expense'])
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
            'type' => ['required', Rule::in(['income', 'owner_capital', 'expense', 'payable_payment', 'asset_purchase', 'transfer'])],
            'cash_account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)],
            'counter_account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id), 'different:cash_account_id'],
            'transaction_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $cashAccount = Account::query()->where('tenant_id', $tenant->id)->findOrFail($validated['cash_account_id']);
        $counterAccount = Account::query()->where('tenant_id', $tenant->id)->findOrFail($validated['counter_account_id']);
        $this->ensureCounterAccountAllowed($validated['type'], $counterAccount);

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
            type: $this->cashFlowType($validated['type']),
            amount: (float) $validated['amount'],
            description: $validated['description'],
            date: $validated['transaction_date'],
            transactionType: $validated['type'],
        );

        return back()->with('success', 'Transaksi kas/bank berhasil dicatat dan pembukuan otomatis dibuat.');
    }

    private function ensureCounterAccountAllowed(string $type, Account $counterAccount): void
    {
        if ($type === 'transfer') {
            abort_unless($counterAccount->is_cash, 422, 'Transfer hanya boleh memakai akun kas/bank tujuan.');

            return;
        }

        abort_unless(! $counterAccount->is_cash && $counterAccount->type === $this->counterAccountType($type), 422, 'Akun lawan tidak sesuai jenis transaksi.');
    }

    private function counterAccountType(string $type): string
    {
        return match ($type) {
            'income' => 'revenue',
            'owner_capital' => 'equity',
            'expense' => 'expense',
            'payable_payment' => 'liability',
            'asset_purchase' => 'asset',
            default => '',
        };
    }

    private function cashFlowType(string $type): string
    {
        return in_array($type, ['income', 'owner_capital'], true) ? 'income' : 'expense';
    }
}
