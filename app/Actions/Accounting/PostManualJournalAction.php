<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\JournalEntry;
use App\Models\Branch;
use App\Models\Tenant;

class PostManualJournalAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    /**
     * @param  array<int, array{account_id:int, description?:string|null, debit?:float|int|string, credit?:float|int|string}>  $lines
     */
    public function handle(Tenant $tenant, ?Branch $branch, string $date, string $description, array $lines): JournalEntry
    {
        return $this->postJournalEntry->handle([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch?->id,
            'entry_number' => 'MJE-'.now()->format('YmdHis'),
            'entry_date' => $date,
            'source_type' => 'manual_journal',
            'description' => $description,
        ], $lines);
    }
}
