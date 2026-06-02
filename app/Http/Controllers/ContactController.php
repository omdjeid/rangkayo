<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Contacts/Index', [
            'contacts' => Contact::query()
                ->where('tenant_id', $tenant->id)
                ->latest()
                ->get(['id', 'type', 'name', 'email', 'phone', 'price_level', 'address', 'is_active']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $validated = $request->validate([
            'type' => ['required', Rule::in(['customer', 'supplier', 'both'])],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'price_level' => ['nullable', Rule::in(['retail', 'grosir'])],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        Contact::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
        ]);

        return back()->with('success', 'Kontak berhasil dibuat.');
    }
}
