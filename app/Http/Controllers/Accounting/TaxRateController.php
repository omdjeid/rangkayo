<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\TaxRate;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TaxRateController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/Taxes/Index', [
            'taxRates' => TaxRate::query()
                ->with(['account:id,code,name', 'inputAccount:id,code,name'])
                ->where('tenant_id', $tenant->id)
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get()
                ->map(fn (TaxRate $taxRate): array => [
                    'id' => $taxRate->id,
                    'name' => $taxRate->name,
                    'code' => $taxRate->code,
                    'rate' => (float) $taxRate->rate,
                    'account' => $taxRate->account ? $taxRate->account->code.' - '.$taxRate->account->name : null,
                    'input_account' => $taxRate->inputAccount ? $taxRate->inputAccount->code.' - '.$taxRate->inputAccount->name : null,
                    'is_default' => $taxRate->is_default,
                    'is_active' => $taxRate->is_active,
                ])->values(),
            'outputAccounts' => Account::query()->where('tenant_id', $tenant->id)->where('type', 'liability')->orderBy('code')->get(['id', 'code', 'name']),
            'inputAccounts' => Account::query()->where('tenant_id', $tenant->id)->where('type', 'asset')->where('is_cash', false)->orderBy('code')->get(['id', 'code', 'name']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:32', Rule::unique('tax_rates')->where('tenant_id', $tenant->id)],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'account_id' => ['nullable', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)->where('type', 'liability')],
            'input_account_id' => ['nullable', Rule::exists('accounts', 'id')->where('tenant_id', $tenant->id)->where('type', 'asset')],
            'is_default' => ['boolean'],
        ]);

        if ($validated['is_default'] ?? false) {
            TaxRate::query()->where('tenant_id', $tenant->id)->update(['is_default' => false]);
        }

        TaxRate::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'account_id' => $validated['account_id'] ?? Account::query()->where('tenant_id', $tenant->id)->where('code', '2020')->value('id'),
            'input_account_id' => $validated['input_account_id'] ?? Account::query()->where('tenant_id', $tenant->id)->where('code', '1070')->value('id'),
            'is_active' => true,
        ]);

        return back()->with('success', 'Tarif pajak berhasil dibuat.');
    }

    public function update(Request $request, TaxRate $taxRate, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        abort_unless($taxRate->tenant_id === $tenant->id, 404);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
            'is_default' => ['required', 'boolean'],
        ]);

        if ($validated['is_default']) {
            TaxRate::query()->where('tenant_id', $tenant->id)->whereKeyNot($taxRate->id)->update(['is_default' => false]);
        }

        $taxRate->update($validated);

        return back()->with('success', 'Tarif pajak berhasil diperbarui.');
    }
}
