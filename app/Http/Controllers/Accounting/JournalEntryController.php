<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Accounting\JournalEntry;
use App\Support\CurrentTenant;
use Inertia\Inertia;
use Inertia\Response;

class JournalEntryController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/JournalEntries/Index', [
            'entries' => JournalEntry::query()
                ->with(['branch:id,name', 'lines.account:id,code,name'])
                ->where('tenant_id', $tenant->id)
                ->latest('entry_date')
                ->latest('id')
                ->limit(100)
                ->get()
                ->map(fn (JournalEntry $entry): array => [
                    'id' => $entry->id,
                    'entry_number' => $entry->entry_number,
                    'entry_date' => $entry->entry_date?->toDateString(),
                    'description' => $entry->description,
                    'source_type' => $entry->source_type,
                    'branch' => $entry->branch?->name,
                    'debit_total' => (float) $entry->lines->sum('debit'),
                    'credit_total' => (float) $entry->lines->sum('credit'),
                    'lines' => $entry->lines->map(fn ($line): array => [
                        'id' => $line->id,
                        'account' => $line->account->code.' - '.$line->account->name,
                        'description' => $line->description,
                        'debit' => (float) $line->debit,
                        'credit' => (float) $line->credit,
                    ])->values(),
                ])->values(),
        ]);
    }
}
