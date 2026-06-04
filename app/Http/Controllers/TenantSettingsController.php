<?php

namespace App\Http\Controllers;

use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class TenantSettingsController extends Controller
{
    public function edit(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Tenancy/Settings/Edit', [
            'tenant' => $tenant->only(['id', 'name', 'slug', 'legal_name', 'tax_number', 'business_type', 'currency_code', 'timezone', 'receipt_prefix', 'invoice_prefix', 'default_cash_account_code', 'default_bank_account_code', 'logo_url']),
        ]);
    }

    public function update(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:64'],
            'business_type' => ['nullable', 'string', 'max:64'],
            'currency_code' => ['required', 'string', 'size:3'],
            'timezone' => ['required', 'string', 'max:64'],
            'receipt_prefix' => ['required', 'string', 'max:16'],
            'invoice_prefix' => ['required', 'string', 'max:16'],
            'default_cash_account_code' => ['required', 'string', 'max:16'],
            'default_bank_account_code' => ['required', 'string', 'max:16'],
            'logo' => ['nullable', 'file', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->storeAs(
                'logos/' . $tenant->id,
                'logo.webp',
                'public'
            );
            $validated['logo_url'] = Storage::disk('public')->url($path);
        }

        unset($validated['logo']);

        $tenant->update($validated);

        return back()->with('success', 'Pengaturan usaha berhasil disimpan.');
    }
}
