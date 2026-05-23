<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\JournalEntry;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PostJournalEntryAction
{
    /**
     * @param  array<int, array{account_id:int, description?:string|null, debit?:numeric-string|float|int, credit?:numeric-string|float|int}>  $lines
     */
    public function handle(array $entryData, array $lines): JournalEntry
    {
        if (count($lines) < 2) {
            throw new InvalidArgumentException('Journal entry must contain at least two lines.');
        }

        $totalDebit = collect($lines)->sum(fn (array $line): float => (float) ($line['debit'] ?? 0));
        $totalCredit = collect($lines)->sum(fn (array $line): float => (float) ($line['credit'] ?? 0));

        if (round($totalDebit, 2) !== round($totalCredit, 2)) {
            throw new InvalidArgumentException('Journal entry must be balanced.');
        }

        $tenant = Tenant::query()->findOrFail($entryData['tenant_id']);
        $branch = null;

        if (! empty($entryData['branch_id'])) {
            $branch = Branch::query()
                ->where('tenant_id', $tenant->id)
                ->whereKey($entryData['branch_id'])
                ->first();

            if (! $branch instanceof Branch) {
                throw new InvalidArgumentException('Cabang jurnal tidak sesuai tenant.');
            }
        }

        $accountIds = collect($lines)->pluck('account_id')->unique()->values();
        $validAccountCount = $tenant->accounts()->whereIn('id', $accountIds)->count();

        if ($validAccountCount !== $accountIds->count()) {
            throw new InvalidArgumentException('Akun jurnal tidak sesuai tenant.');
        }

        app(EnsureAccountingPeriodOpenAction::class)->handle($tenant, $branch, (string) $entryData['entry_date']);

        return DB::transaction(function () use ($entryData, $lines, $tenant, $branch): JournalEntry {
            $user = Auth::user();
            $createdBy = $entryData['created_by'] ?? ($user instanceof User ? $user->id : null);

            /** @var JournalEntry $entry */
            $entry = JournalEntry::query()->create([
                ...$entryData,
                'created_by' => $createdBy,
                'status' => $entryData['status'] ?? 'posted',
                'posted_at' => $entryData['posted_at'] ?? now(),
            ]);

            foreach (array_values($lines) as $index => $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'description' => Arr::get($line, 'description'),
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'line_number' => $index + 1,
                ]);
            }

            app(RecordAuditLogAction::class)->handle(
                tenant: $tenant,
                branch: $branch,
                user: $user instanceof User ? $user : null,
                action: 'journal_entry.posted',
                description: "Jurnal {$entry->entry_number} diposting.",
                auditable: $entry,
                newValues: $entry->load('lines.account')->toArray(),
            );

            return $entry->load('lines.account');
        });
    }
}
