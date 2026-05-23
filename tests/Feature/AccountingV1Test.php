<?php

namespace Tests\Feature;

use App\Actions\Accounting\CreateInvoiceAction;
use App\Actions\Accounting\PayInvoiceAction;
use App\Actions\Accounting\PostManualJournalAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\InvoicePayment;
use App\Models\Accounting\JournalEntry;
use App\Models\Contact;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingV1Test extends TestCase
{
    use RefreshDatabase;

    public function test_manual_journal_invoice_and_payment_flow(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $revenue = Account::query()->where('tenant_id', $tenant->id)->where('code', '4010')->firstOrFail();
        $expense = Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail();
        $customer = Contact::query()->where('tenant_id', $tenant->id)->where('type', 'customer')->firstOrFail();

        $manual = app(PostManualJournalAction::class)->handle($tenant, $branch, '2026-05-21', 'Jurnal penyesuaian', [
            ['account_id' => $expense->id, 'debit' => 10000, 'credit' => 0],
            ['account_id' => $cash->id, 'debit' => 0, 'credit' => 10000],
        ]);
        $this->assertTrue($manual->isBalanced());

        $invoice = app(CreateInvoiceAction::class)->handle($tenant, $branch, $customer, 'sales', '2026-05-21', '2026-05-30', [[
            'account_id' => $revenue->id,
            'description' => 'Invoice jasa',
            'quantity' => 1,
            'unit_price' => 250000,
        ]]);

        $this->assertInstanceOf(Invoice::class, $invoice);
        $this->assertSame('250000.00', $invoice->balance_due);
        $this->assertTrue($invoice->journalEntry->isBalanced());

        $payment = app(PayInvoiceAction::class)->handle($invoice, $cash, 250000, '2026-05-22');

        $this->assertInstanceOf(InvoicePayment::class, $payment);
        $this->assertSame('paid', $invoice->refresh()->status);
        $this->assertSame(3, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
    }

    public function test_accounting_v1_pages_open_for_authenticated_user(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $this->actingAs($user);

        $this->get(route('contacts.index'))->assertOk();
        $this->get(route('manual-journal.create'))->assertOk();
        $this->get(route('invoices.index'))->assertOk();
    }
}
