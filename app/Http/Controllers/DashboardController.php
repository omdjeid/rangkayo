<?php

namespace App\Http\Controllers;

use App\Models\Accounting\JournalLine;
use App\Models\Inventory\Product;
use App\Models\Sales\Sale;
use App\Support\CurrentTenant;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $context->branch;
        $branchId = $branch?->id;
        $warehouse = $branch !== null ? $currentTenant->warehouse($tenant, $branch) : null;

        $salesQuery = Sale::query()->where('tenant_id', $tenant->id);
        $inventoryQuery = $tenant->inventoryMovements();
        $journalQuery = JournalLine::query()
            ->whereHas('journalEntry', fn ($query) => $query->where('tenant_id', $tenant->id));
        $productsQuery = Product::query()->where('tenant_id', $tenant->id);

        if ($branchId !== null) {
            $salesQuery->where('branch_id', $branchId);
            $inventoryQuery->where('branch_id', $branchId);
            $journalQuery->whereHas('journalEntry', fn ($query) => $query->where('branch_id', $branchId));
        }

        $salesToday = (float) (clone $salesQuery)
            ->whereDate('sold_at', today())
            ->sum('grand_total');

        $inventoryValue = (float) $inventoryQuery->sum('total_cost');
        $journalBalance = (float) $journalQuery->sum('debit');

        return Inertia::render('Dashboard', [
            'tenant' => $tenant->only(['id', 'name', 'slug']),
            'branch' => $branch?->only(['id', 'name', 'code']),
            'warehouse' => $warehouse?->only(['id', 'name', 'code']),
            'metrics' => [
                'salesToday' => $salesToday,
                'inventoryValue' => $inventoryValue,
                'journalDebitPosted' => $journalBalance,
                'products' => $productsQuery->count(),
                'salesCount' => (clone $salesQuery)->count(),
            ],
            'recentSales' => (clone $salesQuery)
                ->latest('sold_at')
                ->limit(5)
                ->get(['id', 'sale_number', 'sold_at', 'payment_method', 'grand_total']),
        ]);
    }
}
