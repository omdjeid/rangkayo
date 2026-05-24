<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class BranchSwitchController extends Controller
{
    public function __invoke(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $context = $currentTenant->context($request->user());
        $tenant = $context->tenant;

        abort_unless($context->hasAnyRole(['owner', 'admin', 'accountant']), 403);

        if ($context->isBranchScoped()) {
            abort(403, 'Role Anda memakai cabang yang sudah ditetapkan.');
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', 'integer'],
        ]);

        if (empty($validated['branch_id'])) {
            Session::forget('active_branch_id');

            return back()->with('success', 'Mode kerja dikembalikan ke konsolidasi semua cabang.');
        }

        $branch = Branch::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->findOrFail($validated['branch_id']);

        Session::put('active_branch_id', $branch->id);

        return back()->with('success', "Konteks kerja sekarang fokus ke {$branch->name}.");
    }
}
