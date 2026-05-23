<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Branch;
use App\Support\CurrentTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function ledger(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/Reports/Ledger', [
            'accounts' => $this->accountsWithBalances($tenant->id)->map(fn (Account $account): array => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'normal_balance' => $account->normal_balance,
                'debit' => (float) $account->debit_total,
                'credit' => (float) $account->credit_total,
                'balance' => $this->normalBalanceAmount($account),
            ])->values(),
        ]);
    }

    public function trialBalance(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $accounts = $this->accountsWithBalances($tenant->id)->map(fn (Account $account): array => [
            'id' => $account->id,
            'code' => $account->code,
            'name' => $account->name,
            'debit' => max($this->normalBalanceAmount($account), 0),
            'credit' => max($this->normalBalanceAmount($account) * -1, 0),
        ])->values();

        return Inertia::render('Accounting/Reports/TrialBalance', [
            'accounts' => $accounts,
            'totalDebit' => $accounts->sum('debit'),
            'totalCredit' => $accounts->sum('credit'),
        ]);
    }

    public function profitLoss(Request $request, CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $filters = $this->filters($request, $currentTenant);
        $accounts = $this->accountsWithBalances($tenant->id, $filters['start_date'], $filters['end_date'], $filters['branch_id']);
        $revenue = $accounts->where('type', 'revenue')->map(fn (Account $account): array => $this->reportRow($account, abs($this->normalBalanceAmount($account))))->values();
        $contraRevenue = $accounts->where('type', 'contra_revenue')->map(fn (Account $account): array => $this->reportRow($account, abs($this->normalBalanceAmount($account))))->values();
        $expenses = $accounts->where('type', 'expense')->map(fn (Account $account): array => $this->reportRow($account, abs($this->normalBalanceAmount($account))))->values();

        $totalRevenue = $revenue->sum('balance') - $contraRevenue->sum('balance');
        $totalExpense = $expenses->sum('balance');

        return Inertia::render('Accounting/Reports/ProfitLoss', [
            'filters' => $filters,
            'branches' => $this->branches($tenant->id),
            'revenue' => $revenue,
            'contraRevenue' => $contraRevenue,
            'expenses' => $expenses,
            'totalRevenue' => $totalRevenue,
            'totalExpense' => $totalExpense,
            'netProfit' => $totalRevenue - $totalExpense,
        ]);
    }

    public function balanceSheet(Request $request, CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $filters = $this->filters($request, $currentTenant, includeStartDate: false);
        $accounts = $this->accountsWithBalances($tenant->id, null, $filters['end_date'], $filters['branch_id']);
        $assets = $accounts->where('type', 'asset')->map(fn (Account $account): array => $this->reportRow($account, $this->normalBalanceAmount($account)))->values();
        $liabilities = $accounts->where('type', 'liability')->map(fn (Account $account): array => $this->reportRow($account, abs($this->normalBalanceAmount($account))))->values();
        $equity = $accounts->where('type', 'equity')->map(fn (Account $account): array => $this->reportRow($account, abs($this->normalBalanceAmount($account))))->values();

        return Inertia::render('Accounting/Reports/BalanceSheet', [
            'filters' => $filters,
            'branches' => $this->branches($tenant->id),
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'totalAssets' => $assets->sum('balance'),
            'totalLiabilities' => $liabilities->sum('balance'),
            'totalEquity' => $equity->sum('balance'),
        ]);
    }

    /**
     * @return Collection<int, Account>
     */
    private function accountsWithBalances(int $tenantId, ?string $startDate = null, ?string $endDate = null, ?int $branchId = null): Collection
    {
        $scope = function (Builder $query) use ($startDate, $endDate, $branchId): void {
            $query->whereHas('journalEntry', function (Builder $entryQuery) use ($startDate, $endDate, $branchId): void {
                if ($startDate !== null) {
                    $entryQuery->whereDate('entry_date', '>=', $startDate);
                }

                if ($endDate !== null) {
                    $entryQuery->whereDate('entry_date', '<=', $endDate);
                }

                if ($branchId !== null) {
                    $entryQuery->where('branch_id', $branchId);
                }
            });
        };

        return Account::query()
            ->where('tenant_id', $tenantId)
            ->withSum(['journalLines as debit_total' => $scope], 'debit')
            ->withSum(['journalLines as credit_total' => $scope], 'credit')
            ->orderBy('code')
            ->get();
    }

    private function normalBalanceAmount(Account $account): float
    {
        $debit = (float) ($account->debit_total ?? 0);
        $credit = (float) ($account->credit_total ?? 0);

        return $account->normal_balance === 'debit' ? $debit - $credit : $credit - $debit;
    }

    /**
     * @return array{code:string, name:string, balance:float}
     */
    private function reportRow(Account $account, float $balance): array
    {
        return [
            'code' => $account->code,
            'name' => $account->name,
            'balance' => $balance,
        ];
    }

    /**
     * @return array{start_date:string|null, end_date:string, branch_id:int|null}
     */
    private function filters(Request $request, CurrentTenant $currentTenant, bool $includeStartDate = true): array
    {
        $context = $currentTenant->context();
        $branchId = $context->isBranchScoped() ? $context->branchId() : ($request->integer('branch_id') ?: null);

        return [
            'start_date' => $includeStartDate ? ($request->date('start_date')?->toDateString() ?? now()->startOfMonth()->toDateString()) : null,
            'end_date' => $request->date('end_date')?->toDateString() ?? now()->toDateString(),
            'branch_id' => $branchId,
        ];
    }

    private function branches(int $tenantId): mixed
    {
        return Branch::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
    }
}
