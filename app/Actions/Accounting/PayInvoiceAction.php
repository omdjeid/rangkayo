<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\InvoicePayment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PayInvoiceAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Invoice $invoice, Account $cashAccount, float $amount, string $date, ?string $notes = null): InvoicePayment
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal pembayaran harus lebih dari 0.');
        }

        if ($amount > (float) $invoice->balance_due) {
            throw new InvalidArgumentException('Nominal pembayaran melebihi sisa invoice.');
        }

        if (! $cashAccount->is_cash || $cashAccount->tenant_id !== $invoice->tenant_id) {
            throw new InvalidArgumentException('Akun pembayaran harus kas/bank tenant invoice.');
        }

        return DB::transaction(function () use ($invoice, $cashAccount, $amount, $date, $notes): InvoicePayment {
            $number = 'PAY-'.now()->format('YmdHis');
            $controlAccount = $this->controlAccount($invoice);
            $lines = $invoice->type === 'sales'
                ? [
                    ['account_id' => $cashAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => 'Terima pembayaran invoice'],
                    ['account_id' => $controlAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => 'Pelunasan piutang'],
                ]
                : [
                    ['account_id' => $controlAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => 'Pelunasan hutang'],
                    ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => 'Bayar invoice supplier'],
                ];

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $invoice->tenant_id,
                'branch_id' => $invoice->branch_id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $date,
                'source_type' => 'invoice_payment',
                'description' => 'Pembayaran '.$invoice->invoice_number,
            ], $lines);

            /** @var InvoicePayment $payment */
            $payment = InvoicePayment::query()->create([
                'tenant_id' => $invoice->tenant_id,
                'invoice_id' => $invoice->id,
                'cash_account_id' => $cashAccount->id,
                'journal_entry_id' => $journalEntry->id,
                'payment_number' => $number,
                'payment_date' => $date,
                'amount' => $amount,
                'notes' => $notes,
            ]);

            $invoice->paid_total = (float) $invoice->paid_total + $amount;
            $invoice->balance_due = max(0, (float) $invoice->grand_total - (float) $invoice->paid_total);
            $invoice->status = $invoice->balance_due <= 0 ? 'paid' : 'partial';
            $invoice->save();

            return $payment->load(['invoice', 'cashAccount', 'journalEntry.lines.account']);
        });
    }

    private function controlAccount(Invoice $invoice): Account
    {
        $code = $invoice->type === 'sales' ? '1030' : '2010';
        $account = Account::query()->where('tenant_id', $invoice->tenant_id)->where('code', $code)->first();

        if (! $account instanceof Account) {
            throw new InvalidArgumentException("Akun {$code} belum tersedia.");
        }

        return $account;
    }
}
