<?php

namespace App\Http\Controllers;

use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantSettingsController extends Controller
{
    public function edit(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render(Tenancy/Settings/Edit, [
            tenant => $tenant->only([id, name, slug, legal_name, tax_number, business_type, currency_code, timezone, receipt_prefix, invoice_prefix, default_cash_account_code, default_bank_account_code]),
        ]);
    }

    public function update(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            name => [required, string, max:255],
            legal_name => [nullable, string, max:255],
            tax_number => [nullable, string, max:64],
            business_type => [nullable, string, max:64],
            currency_code => [required, string, size:3],
            timezone => [required, string, max:64],
            receipt_prefix => [required, string, max:16],
            invoice_prefix => [required, string, max:16],
            default_cash_account_code => [required, string, max:16],
            default_bank_account_code => [required, string, max:16],
        ]);

        $tenant->update($validated);

        return back()->with(success, Pengaturan usaha berhasil disimpan.);
    }
}
