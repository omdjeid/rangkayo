<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\LockAccountingPeriodAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\AccountingPeriod;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountingPeriodController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/Periods/Index', [
            'periods' => AccountingPeriod::query()
                ->with(['branch:id,name', 'lockedBy:id,name'])
                ->where('tenant_id', $tenant->id)
                ->latest('ends_on')
                ->latest('id')
                ->limit(50)
                ->get()
                ->map(fn (AccountingPeriod $period): array => [
                    'id' => $period->id,
                    'name' => $period->name,
                    'starts_on' => $period->starts_on?->toDateString(),
                    'ends_on' => $period->ends_on?->toDateString(),
                    'status' => $period->status,
                    'branch' => $period->branch?->name,
                    'locked_at' => $period->locked_at?->toDateTimeString(),
                    'locked_by' => $period->lockedBy?->name,
                    'notes' => $period->notes,
                ])->values(),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, LockAccountingPeriodAction $lockAccountingPeriod): RedirectResponse
    {
        $validated = $request->validate([
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'scope' => ['required', 'in:tenant,branch'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenant = $currentTenant->tenant();
        $branch = $validated['scope'] === 'branch' ? $currentTenant->branch($tenant) : null;
        $user = $request->user();

        abort_unless($user !== null, 403);

        $lockAccountingPeriod->handle(
            tenant: $tenant,
            branch: $branch,
            startsOn: $validated['starts_on'],
            endsOn: $validated['ends_on'],
            user: $user,
            notes: $validated['notes'] ?? null,
        );

        return redirect()->route('accounting-periods.index')->with('success', 'Periode akuntansi berhasil dikunci.');
    }
}
