<?php

namespace Tests\Feature;

use App\Actions\Accounting\CreateFixedAssetAction;
use App\Actions\Accounting\CreateInvoiceAction;
use App\Actions\Accounting\PostFixedAssetDepreciationAction;
use App\Actions\Accounting\RecordCashTransactionAction;
use App\Actions\Accounting\RecordCashTransferAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\CashTransaction;
use App\Models\Accounting\FixedAsset;
use App\Models\Accounting\FixedAssetDepreciation;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\TaxRate;
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

    public function test_cash_transaction_form_filters_and_validates_counter_accounts_by_type(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $cash = Account::query()->where('tenant_id', $tenant->id)->where('code', '1010')->firstOrFail();
        $bank = Account::query()->where('tenant_id', $tenant->id)->where('code', '1020')->firstOrFail();
        $expense = Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail();
        $revenue = Account::query()->where('tenant_id', $tenant->id)->where('code', '7010')->firstOrFail();
        $payable = Account::query()->where('tenant_id', $tenant->id)->where('code', '2010')->firstOrFail();
        $equity = Account::query()->where('tenant_id', $tenant->id)->where('code', '3010')->firstOrFail();
        $asset = Account::query()->where('tenant_id', $tenant->id)->where('code', '1050')->firstOrFail();

        $page = $this->actingAs($user)->get(route('cash-transactions.index'))->assertOk();
        $page->assertInertia(fn ($assert) => $assert
            ->component('Accounting/CashTransactions/Index')
            ->where('cashAccounts.0.code', '1010')
            ->where('counterAccounts.0.is_cash', false)
        );

        $this->post(route('cash-transactions.store'), [
            'type' => 'expense',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $revenue->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Pengeluaran salah akun',
        ])->assertStatus(422);

        $this->post(route('cash-transactions.store'), [
            'type' => 'income',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $expense->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Pemasukan salah akun',
        ])->assertStatus(422);

        $this->post(route('cash-transactions.store'), [
            'type' => 'income',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $payable->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Pemasukan salah hutang',
        ])->assertStatus(422);

        $this->post(route('cash-transactions.store'), [
            'type' => 'payable_payment',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $payable->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Bayar hutang dagang',
        ])->assertRedirect();

        $this->post(route('cash-transactions.store'), [
            'type' => 'owner_capital',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $equity->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Setoran modal',
        ])->assertRedirect();

        $this->post(route('cash-transactions.store'), [
            'type' => 'asset_purchase',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $asset->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Beli aset',
        ])->assertRedirect();

        $this->post(route('cash-transactions.store'), [
            'type' => 'transfer',
            'cash_account_id' => $cash->id,
            'counter_account_id' => $bank->id,
            'transaction_date' => '2026-05-21',
            'amount' => 10000,
            'description' => 'Transfer benar',
        ])->assertRedirect();
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

    public function test_fixed_asset_can_be_created_and_depreciated(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();

        $asset = app(CreateFixedAssetAction::class)->handle(
            tenant: $tenant,
            branch: $branch,
            name: 'Etalase Toko',
            acquiredAt: '2026-05-01',
            depreciationStartedAt: '2026-06-01',
            acquisitionCost: 12000000,
            salvageValue: 0,
            usefulLifeMonths: 48,
        );

        $this->assertInstanceOf(FixedAsset::class, $asset);
        $this->assertSame('250000.00', $asset->monthly_depreciation);
        $this->assertSame(1, FixedAsset::query()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(1, JournalEntry::query()->where('tenant_id', $tenant->id)->count());

        $depreciation = app(PostFixedAssetDepreciationAction::class)->handle($asset, '2026-06-30');

        $this->assertInstanceOf(FixedAssetDepreciation::class, $depreciation);
        $this->assertSame('250000.00', $depreciation->amount);
        $this->assertSame('250000.00', $asset->fresh()->accumulated_depreciation);
        $this->assertSame(2, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
        $this->assertTrue($depreciation->journalEntry->isBalanced());
    }

    public function test_tax_rate_can_be_created_and_applied_to_sales_invoice(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $customer = $tenant->contacts()->where('type', 'customer')->firstOrFail();
        $revenue = Account::query()->where('tenant_id', $tenant->id)->where('code', '4010')->firstOrFail();
        $taxPayable = Account::query()->where('tenant_id', $tenant->id)->where('code', '2020')->firstOrFail();
        $taxInput = Account::query()->where('tenant_id', $tenant->id)->where('code', '1070')->firstOrFail();
        $taxRate = TaxRate::query()->where('tenant_id', $tenant->id)->where('code', 'PPN11')->firstOrFail();

        $invoice = app(CreateInvoiceAction::class)->handle($tenant, $branch, $customer, 'sales', '2026-05-24', '2026-05-31', [[
            'account_id' => $revenue->id,
            'description' => 'Penjualan kena pajak',
            'quantity' => 2,
            'unit_price' => 100000,
            'tax_rate_id' => $taxRate->id,
        ]]);

        $this->assertInstanceOf(Invoice::class, $invoice);
        $this->assertSame('200000.00', $invoice->subtotal);
        $this->assertSame('22000.00', $invoice->tax_total);
        $this->assertSame('222000.00', $invoice->grand_total);
        $this->assertSame('222000.00', $invoice->balance_due);
        $this->assertSame('22000.00', $invoice->items->first()->tax_total);
        $this->assertTrue($invoice->journalEntry->isBalanced());
        $this->assertDatabaseHas('journal_lines', [
            'journal_entry_id' => $invoice->journal_entry_id,
            'account_id' => $taxPayable->id,
            'debit' => '0.00',
            'credit' => '22000.00',
        ]);

        $purchase = app(CreateInvoiceAction::class)->handle($tenant, $branch, $customer, 'purchase', '2026-05-24', '2026-05-31', [[
            'account_id' => Account::query()->where('tenant_id', $tenant->id)->where('code', '6010')->firstOrFail()->id,
            'description' => 'Pembelian kena pajak',
            'quantity' => 1,
            'unit_price' => 100000,
            'tax_rate_id' => $taxRate->id,
        ]]);

        $this->assertDatabaseHas('journal_lines', [
            'journal_entry_id' => $purchase->journal_entry_id,
            'account_id' => $taxInput->id,
            'debit' => '11000.00',
            'credit' => '0.00',
        ]);
    }

    public function test_accounting_report_pages_open_for_authenticated_user(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();

        $this->actingAs($user);

        $this->get(route('cash-transactions.index'))->assertOk();
        $this->get(route('fixed-assets.index'))->assertOk();
        $invoice = Invoice::query()->where('tenant_id', $user->tenants()->firstOrFail()->id)->first();

        $this->get(route('taxes.index'))->assertOk();
        if ($invoice instanceof Invoice) {
            $this->get(route('invoices.print', $invoice))->assertOk();
        }
        $this->get(route('reports.ledger'))->assertOk();
        $this->get(route('reports.trial-balance'))->assertOk();
        $this->get(route('reports.profit-loss'))->assertOk();
        $this->get(route('reports.profit-loss', ['branch_id' => $user->tenants()->firstOrFail()->pivot->branch_id]))->assertOk();
        $this->get(route('reports.balance-sheet'))->assertOk();
        $this->get(route('reports.balance-sheet', ['end_date' => now()->toDateString()]))->assertOk();
    }
}
