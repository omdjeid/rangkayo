<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/Accounts/Index', [
            'accounts' => Account::query()
                ->where('tenant_id', $tenant->id)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type', 'normal_balance', 'is_cash', 'is_system', 'is_active']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:32', Rule::unique('accounts')->where('tenant_id', $tenant->id)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['asset', 'liability', 'equity', 'revenue', 'contra_revenue', 'expense'])],
            'normal_balance' => ['required', Rule::in(['debit', 'credit'])],
            'is_cash' => ['boolean'],
        ]);

        Account::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'is_cash' => $request->boolean('is_cash'),
        ]);

        return back()->with('success', 'Akun berhasil dibuat.');
    }
}
