<?php

namespace App\Http\Controllers;

use App\Models\Sales\Sale;
use App\Support\CurrentTenant;
use App\Support\PrintPreferences;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptController extends Controller
{
    public function show(Sale $sale, CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        abort_unless($sale->tenant_id === $tenant->id, 404);

        $sale->load(['items', 'branch', 'warehouse', 'user']);

        return Inertia::render('POS/Receipt', [
            'tenant' => $tenant->only(['name', 'logo_url']),
            'printPreference' => PrintPreferences::forTenant($tenant)['receipt'],
            'sale' => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'sold_at' => $sale->sold_at?->toDateTimeString(),
                'payment_method' => $sale->payment_method,
                'subtotal' => (float) $sale->subtotal,
                'grand_total' => (float) $sale->grand_total,
                'paid_total' => (float) $sale->paid_total,
                'change_total' => (float) $sale->change_total,
                'branch' => [
                    'name' => $sale->branch?->name,
                    'phone' => $sale->branch?->phone,
                    'address' => $sale->branch?->address,
                ],
                'cashier' => $sale->user?->name,
                'items' => $sale->items->map(fn ($item): array => [
                    'product_name' => $item->product_name,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                ])->values(),
            ],
        ]);
    }
}
