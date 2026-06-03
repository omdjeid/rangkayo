<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\CustomerOverride;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerOverrideController extends Controller
{
    public function index(Contact $contact, CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        $overrides = CustomerOverride::query()
            ->where('tenant_id', $tenant->id)
            ->where('contact_id', $contact->id)
            ->with('product:id,name,sku')
            ->get();

        return Inertia::render('Contacts/Overrides', [
            'contact' => $contact->only(['id', 'name', 'price_level']),
            'overrides' => $overrides->map(fn ($o): array => [
                'id' => $o->id,
                'product_id' => $o->product_id,
                'product_name' => $o->product?->name ?? '-',
                'price' => (float) $o->price,
            ])->values(),
        ]);
    }

    public function store(Request $request, Contact $contact, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        CustomerOverride::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'contact_id' => $contact->id,
                'product_id' => $validated['product_id'],
            ],
            [
                'price' => $validated['price'],
            ],
        );

        return back()->with('success', 'Harga override berhasil disimpan.');
    }

    public function destroy(Contact $contact, CustomerOverride $override, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        if ($override->tenant_id !== $tenant->id || $override->contact_id !== $contact->id) {
            abort(404);
        }

        $override->delete();

        return back()->with('success', 'Harga override berhasil dihapus.');
    }
}
