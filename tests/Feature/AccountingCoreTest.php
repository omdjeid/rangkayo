<?php

namespace Tests\Feature;

use App\Actions\Accounting\RecordCashTransactionAction;
use App\Actions\Accounting\RecordCashTransferAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\CashTransaction;
use App\Models\Accounting\JournalEntry;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingCoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_expense_creates_cash_transaction_and_balanced_journal(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $expense = Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail();

        $transaction = app(RecordCashTransactionAction::class)->handle(
            tenant: $tenant,
            branch: $branch,
            cashAccount: $cash,
            counterAccount: $expense,
            type: 'expense',
            amount: 125000,
            description: 'Bayar listrik toko',
            date: '2026-05-21',
        );

        $this->assertInstanceOf(CashTransaction::class, $transaction);
        $this->assertTrue($transaction->journalEntry->isBalanced());
        $this->assertSame('125000.00', $transaction->amount);
        $this->assertSame(1, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
    }

    public function test_cash_transfer_creates_balanced_journal_between_cash_accounts(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $bank = Account::query()->where('tenant_id', $tenant->id)->where('code', '1020')->firstOrFail();

        $transaction = app(RecordCashTransferAction::class)->handle(
            tenant: $tenant,
            branch: $branch,
            fromAccount: $cash,
            toAccount: $bank,
            amount: 250000,
            description: 'Setor kas ke bank',
            date: '2026-05-21',
        );

        $this->assertSame('transfer', $transaction->type);
        $this->assertSame('250000.00', $transaction->amount);
        $this->assertTrue($transaction->journalEntry->isBalanced());
        $this->assertSame(1, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
    }

    public function test_accounting_report_pages_open_for_authenticated_user(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();

        $this->actingAs($user);

        $this->get(route('cash-transactions.index'))->assertOk();
        $this->get(route('reports.ledger'))->assertOk();
        $this->get(route('reports.trial-balance'))->assertOk();
        $this->get(route('reports.profit-loss'))->assertOk();
        $this->get(route('reports.profit-loss', ['branch_id' => $user->tenants()->firstOrFail()->pivot->branch_id]))->assertOk();
        $this->get(route('reports.balance-sheet'))->assertOk();
        $this->get(route('reports.balance-sheet', ['end_date' => now()->toDateString()]))->assertOk();
    }
}
