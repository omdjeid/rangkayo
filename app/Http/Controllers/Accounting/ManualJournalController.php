<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\PostManualJournalAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ManualJournalController extends Controller
{
    public function create(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/ManualJournal/Create', [
            'accounts' => Account::query()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, PostManualJournalAction $postManualJournal): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);

        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $postManualJournal->handle($tenant, $branch, $validated['entry_date'], $validated['description'], $validated['lines']);

        return redirect()->route('journal-entries.index')->with('success', 'Jurnal manual berhasil diposting.');
    }
}
