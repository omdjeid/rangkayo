<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Sales\Sale;
use App\Models\Sales\SaleItem;
use App\Support\CurrentTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BranchComparisonReportController extends Controller
{
    public function __invoke(Request $request, CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $startDate = $request->date('start_date')?->toDateString() ?? now()->startOfMonth()->toDateString();
        $endDate = $request->date('end_date')?->toDateString() ?? now()->toDateString();

        $branches = Branch::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->when($context->isBranchScoped(), fn (Builder $query) => $query->whereIn('id', $context->branchIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $branchIds = $branches->pluck('id')->all();

        $sales = Sale::query()
            ->select('branch_id', DB::raw('count(*) as transactions'), DB::raw('coalesce(sum(grand_total), 0) as revenue'))
            ->where('tenant_id', $tenant->id)
            ->whereIn('branch_id', $branchIds)
            ->whereDate('sold_at', '>=', $startDate)
            ->whereDate('sold_at', '<=', $endDate)
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        $costs = SaleItem::query()
            ->select('sales.branch_id', DB::raw('coalesce(sum(sale_items.cost_total), 0) as cost_total'))
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.tenant_id', $tenant->id)
            ->whereIn('sales.branch_id', $branchIds)
            ->whereDate('sales.sold_at', '>=', $startDate)
            ->whereDate('sales.sold_at', '<=', $endDate)
            ->groupBy('sales.branch_id')
            ->get()
            ->keyBy('branch_id');

        $stock = InventoryMovement::query()
            ->select('branch_id', DB::raw('coalesce(sum(quantity_in - quantity_out), 0) as stock_on_hand'), DB::raw('coalesce(sum(case when quantity_in > 0 then total_cost else -total_cost end), 0) as stock_value'))
            ->where('tenant_id', $tenant->id)
            ->whereIn('branch_id', $branchIds)
            ->whereDate('movement_at', '<=', $endDate)
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        $rows = $branches->map(function (Branch $branch) use ($sales, $costs, $stock): array {
            $sale = $sales->get($branch->id);
            $cost = $costs->get($branch->id);
            $stockRow = $stock->get($branch->id);
            $revenue = (float) ($sale->revenue ?? 0);
            $costTotal = (float) ($cost->cost_total ?? 0);
            $grossProfit = $revenue - $costTotal;

            return [
                'branch_id' => $branch->id,
                'branch' => $branch->name,
                'code' => $branch->code,
                'transactions' => (int) ($sale->transactions ?? 0),
                'revenue' => $revenue,
                'cost_total' => $costTotal,
                'gross_profit' => $grossProfit,
                'gross_margin' => $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0.0,
                'stock_on_hand' => (float) ($stockRow->stock_on_hand ?? 0),
                'stock_value' => (float) ($stockRow->stock_value ?? 0),
            ];
        })->values();

        return Inertia::render('Reports/BranchComparison/Index', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'summary' => [
                'branches' => $rows->count(),
                'transactions' => $rows->sum('transactions'),
                'revenue' => $rows->sum('revenue'),
                'gross_profit' => $rows->sum('gross_profit'),
                'stock_value' => $rows->sum('stock_value'),
            ],
            'rows' => $rows,
        ]);
    }
}
