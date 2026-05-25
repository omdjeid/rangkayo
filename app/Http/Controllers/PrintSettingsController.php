<?php

namespace App\Http\Controllers;

use App\Support\CurrentTenant;
use App\Support\PrintPreferences;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrintSettingsController extends Controller
{
    public function edit(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Tenancy/PrintSettings/Edit', [
            'tenant' => $tenant->only(['id', 'name']),
            'printPreferences' => PrintPreferences::forTenant($tenant),
        ]);
    }

    public function update(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate(
            PrintPreferences::validationRules(),
            PrintPreferences::validationMessages(),
        );

        $settings = is_array($tenant->settings) ? $tenant->settings : [];
        $settings['print_preferences'] = PrintPreferences::normalize($validated['print_preferences']);

        $tenant->update(['settings' => $settings]);

        return back()->with('success', 'Pengaturan cetak berhasil disimpan.');
    }
}
