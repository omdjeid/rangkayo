<?php

namespace App\Http\Controllers;

use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QrisSettingsController extends Controller
{
    public function edit(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Tenancy/QrisSettings/Edit', [
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

        $validated = $request->validate([
            'merchant_name' => ['nullable', 'string', 'max:255'],
            'manual_qris_string' => ['nullable', 'string', 'max:1024'],
            'image_url' => ['nullable', 'string', 'max:512'],
            'status' => ['nullable', 'string', 'max:32'],
        ]);

        $settings = $tenant->settings ?? [];
        $settings['payment']['qris'] = array_merge(
            data_get($settings, 'payment.qris', []),
            $validated
        );
        $tenant->settings = $settings;
        $tenant->save();

        return back()->with('success', 'Pengaturan QRIS berhasil disimpan.');
    }
}
