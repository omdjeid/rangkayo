<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\CustomerOverride;
use App\Models\Inventory\Product;
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
            ->where(tenant_id, $tenant->id)
            ->where(contact_id, $contact->id)
            ->with(product:id,name,sku,selling_price)
            ->latest()
            ->get();

        return Inertia::render(Contacts/Overrides, [
            contact => $contact->only([id, name, type, price_level]),
            overrides => $overrides->map(fn ($o) => [
                id => $o->id,
                product_id => $o->product_id,
                product_name => $o->product->name,
                product_sku => $o->product->sku,
                original_price => (float) $o->product->selling_price,
                price => (float) $o->price,
            ])->values(),
            products => Product::query()
                ->where(tenant_id, $tenant->id)
                ->where(is_active, true)
                ->orderBy(name)
                ->get([id, name, sku, selling_price]),
        ]);
    }

    public function store(Request $request, Contact $contact, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            product_id => [required, integer, exists:products,id],
            price => [required, numeric, min:0],
        ]);

        CustomerOverride::updateOrCreate(
            [
                tenant_id => $tenant->id,
                contact_id => $contact->id,
                product_id => $validated[product_id],
            ],
            [
                price => $validated[price],
            ]
        );

        return back()->with(success, Harga khusus berhasil disimpan.);
    }

    public function destroy(Contact $contact, CustomerOverride $override, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        if ($override->tenant_id !== $tenant->id || $override->contact_id !== $contact->id) {
            abort(403);
        }

        $override->delete();

        return back()->with(success, Harga khusus berhasil dihapus.);
    }
}
