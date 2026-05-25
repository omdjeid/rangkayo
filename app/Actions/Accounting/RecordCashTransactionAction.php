<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\CashTransaction;
use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordCashTransactionAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Tenant $tenant, ?Branch $branch, Account $cashAccount, Account $counterAccount, string $type, float $amount, string $description, ?string $date = null, ?string $transactionType = null): CashTransaction
    {
        if (! in_array($type, ['income', 'expense'], true)) {
            throw new InvalidArgumentException('Tipe transaksi kas harus income atau expense.');
        }

        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal transaksi harus lebih dari 0.');
        }

        if ($cashAccount->tenant_id !== $tenant->id || $counterAccount->tenant_id !== $tenant->id) {
            throw new InvalidArgumentException('Akun tidak sesuai tenant aktif.');
        }

        if (! $cashAccount->is_cash) {
            throw new InvalidArgumentException('Akun pembayaran harus akun kas/bank.');
        }

        return DB::transaction(function () use ($tenant, $branch, $cashAccount, $counterAccount, $type, $amount, $description, $date, $transactionType): CashTransaction {
            $prefix = $type === 'income' ? 'RCV' : 'PAY';
            $number = $prefix.'-'.now()->format('YmdHis').'-'.str()->upper(str()->random(4));
            $transactionDate = $date ?? today()->toDateString();

            $lines = $type === 'income'
                ? [
                    ['account_id' => $cashAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => $description],
                    ['account_id' => $counterAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => $description],
                ]
                : [
                    ['account_id' => $counterAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => $description],
                    ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => $description],
                ];

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $transactionDate,
                'source_type' => 'cash_transaction',
                'description' => $description,
            ], $lines);

            /** @var CashTransaction $transaction */
            $transaction = CashTransaction::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'cash_account_id' => $cashAccount->id,
                'counter_account_id' => $counterAccount->id,
                'journal_entry_id' => $journalEntry->id,
                'transaction_number' => $number,
                'type' => $transactionType ?? $type,
                'transaction_date' => $transactionDate,
                'amount' => $amount,
                'description' => $description,
            ]);

            return $transaction->load(['cashAccount', 'counterAccount', 'journalEntry.lines.account']);
        });
    }
}
