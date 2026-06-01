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

        return Inertia::render('Tenancy/Settings/Edit', [
            'tenant' => $tenant->only(['id', 'name', 'slug', 'legal_name', 'tax_number', 'business_type', 'currency_code', 'timezone', 'receipt_prefix', 'invoice_prefix', 'default_cash_account_code', 'default_bank_account_code']),
            'qris' => [
                'merchant_name' => data_get($tenant->settings, 'payment.qris.merchant_name', ''),
                'manual_qris_string' => data_get($tenant->settings, 'payment.qris.manual_qris_string', ''),
                'image_url' => data_get($tenant->settings, 'payment.qris.image_url', ''),
                'status' => data_get($tenant->settings, 'payment.qris.status', ''),
            ],
        ]);
    }

    public function update(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        // Update tenant fields only if present (QRIS form sends only qris.* fields)
        if ($request->has('name')) {
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
            ]);
            $tenant->update($validated);
        }

        // Update QRIS settings
        if ($request->has('qris')) {
            $qris = $request->validate([
                'qris.merchant_name' => ['nullable', 'string', 'max:255'],
                'qris.manual_qris_string' => ['nullable', 'string', 'max:1024'],
                'qris.image_url' => ['nullable', 'string', 'max:512'],
                'qris.status' => ['nullable', 'string', 'max:32'],
            ]);
            $settings = $tenant->settings ?? [];
            $settings['payment']['qris'] = array_merge(
                data_get($settings, 'payment.qris', []),
                $qris['qris']
            );
            $tenant->settings = $settings;
            $tenant->save();
        }

        return back()->with('success', 'Pengaturan usaha berhasil disimpan.');
    }
}
