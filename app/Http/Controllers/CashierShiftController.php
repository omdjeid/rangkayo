<?php

namespace App\Http\Controllers;

use App\Actions\Sales\CloseCashierShiftAction;
use App\Actions\Sales\OpenCashierShiftAction;
use App\Models\Sales\CashierShift;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashierShiftController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);

        $query = CashierShift::query()
            ->with('user:id,name,email')
            ->where('tenant_id', $tenant->id)
            ->latest('opened_at');

        if ($context->isBranchScoped()) {
            $query->where('branch_id', $branch->id);
        }

        return Inertia::render('POS/Shifts/Index', [
            'shifts' => $query->limit(50)->get()->map(fn (CashierShift $shift): array => [
                'id' => $shift->id,
                'cashier' => $shift->user?->name,
                'opened_at' => $shift->opened_at?->toDateTimeString(),
                'closed_at' => $shift->closed_at?->toDateTimeString(),
                'opening_cash' => (float) $shift->opening_cash,
                'expected_cash' => (float) $shift->expected_cash,
                'actual_cash' => $shift->actual_cash !== null ? (float) $shift->actual_cash : null,
                'cash_difference' => $shift->cash_difference !== null ? (float) $shift->cash_difference : null,
                'status' => $shift->status,
            ])->values(),
        ]);
    }

    public function open(Request $request, CurrentTenant $currentTenant, OpenCashierShiftAction $openShift): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $branch = $currentTenant->branch($tenant);
        $warehouse = $currentTenant->warehouse($tenant, $branch);
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $validated = $request->validate([
            'opening_cash' => ['nullable', 'numeric', 'min:0'],
            'opening_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $openShift->handle($tenant, $branch, $warehouse, $user, (float) ($validated['opening_cash'] ?? 0), $validated['opening_notes'] ?? null);

        return back()->with('success', 'Shift kasir dibuka.');
    }

    public function close(Request $request, CurrentTenant $currentTenant, CloseCashierShiftAction $closeShift): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
            'closing_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $shift = CashierShift::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->firstOrFail();

        $closeShift->handle($shift, $user, (float) $validated['actual_cash'], $validated['closing_notes'] ?? null);

        return back()->with('success', 'Shift kasir ditutup.');
    }
}
