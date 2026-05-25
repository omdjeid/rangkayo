<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\CashTransaction;
use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordCashTransferAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Tenant $tenant, ?Branch $branch, Account $fromAccount, Account $toAccount, float $amount, string $description, ?string $date = null): CashTransaction
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal transfer harus lebih dari 0.');
        }

        if ($fromAccount->tenant_id !== $tenant->id || $toAccount->tenant_id !== $tenant->id) {
            throw new InvalidArgumentException('Akun transfer tidak sesuai tenant aktif.');
        }

        if (! $fromAccount->is_cash || ! $toAccount->is_cash) {
            throw new InvalidArgumentException('Transfer hanya bisa dilakukan antar akun kas/bank.');
        }

        if ($fromAccount->is($toAccount)) {
            throw new InvalidArgumentException('Akun asal dan tujuan transfer tidak boleh sama.');
        }

        return DB::transaction(function () use ($tenant, $branch, $fromAccount, $toAccount, $amount, $description, $date): CashTransaction {
            $number = 'TRC-'.now()->format('YmdHis').'-'.str()->upper(str()->random(4));
            $transactionDate = $date ?? today()->toDateString();

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $transactionDate,
                'source_type' => 'cash_transfer',
                'description' => $description,
            ], [
                ['account_id' => $toAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => $description],
                ['account_id' => $fromAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => $description],
            ]);

            /** @var CashTransaction $transaction */
            $transaction = CashTransaction::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'cash_account_id' => $fromAccount->id,
                'counter_account_id' => $toAccount->id,
                'journal_entry_id' => $journalEntry->id,
                'transaction_number' => $number,
                'type' => 'transfer',
                'transaction_date' => $transactionDate,
                'amount' => $amount,
                'description' => $description,
            ]);

            return $transaction->load(['cashAccount', 'counterAccount', 'journalEntry.lines.account']);
        });
    }
}
