<?php

namespace Tests\Feature;

use App\Actions\Accounting\LockAccountingPeriodAction;
use App\Actions\Accounting\PostManualJournalAction;
use App\Actions\Accounting\RecordCashTransactionAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\AccountingPeriod;
use App\Models\Accounting\JournalEntry;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class AccountingControlsTest extends TestCase
{
    use RefreshDatabase;

    public function test_locked_period_blocks_journal_posting_and_records_audit_log(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $expense = Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail();

        $this->actingAs($user);

        $period = app(LockAccountingPeriodAction::class)->handle(
            tenant: $tenant,
            branch: null,
            startsOn: '2026-05-01',
            endsOn: '2026-05-31',
            user: $user,
            notes: 'Closing Mei',
        );

        $this->assertInstanceOf(AccountingPeriod::class, $period);
        $this->assertTrue($period->isLocked());
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'accounting_period.locked',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('sudah dikunci');

        app(PostManualJournalAction::class)->handle($tenant, $branch, '2026-05-21', 'Jurnal periode terkunci', [
            ['account_id' => $expense->id, 'debit' => 10000, 'credit' => 0],
            ['account_id' => $cash->id, 'debit' => 0, 'credit' => 10000],
        ]);
    }

    public function test_journal_posting_creates_audit_log_and_control_pages_open(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $expense = Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail();

        $this->actingAs($user);

        app(RecordCashTransactionAction::class)->handle(
            tenant: $tenant,
            branch: $branch,
            cashAccount: $cash,
            counterAccount: $expense,
            type: 'expense',
            amount: 50000,
            description: 'Bayar ATK',
            date: '2026-06-01',
        );

        $this->assertSame(1, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(1, AuditLog::query()->where('tenant_id', $tenant->id)->where('action', 'journal_entry.posted')->count());

        $this->get(route('accounting-periods.index'))->assertOk();
        $this->get(route('audit-logs.index'))->assertOk();
    }
}
