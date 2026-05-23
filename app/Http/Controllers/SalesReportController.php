<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Sales\Sale;
use App\Models\Sales\SaleItem;
use App\Support\CurrentTenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalesReportController extends Controller
{
    public function __invoke(Request $request, CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);
        $startDate = $request->date('start_date')?->toDateString() ?? now()->startOfMonth()->toDateString();
        $endDate = $request->date('end_date')?->toDateString() ?? now()->toDateString();
        $branchId = $context->isBranchScoped() ? $branch->id : ($request->integer('branch_id') ?: null);

        $salesQuery = Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereDate('sold_at', '>=', $startDate)
            ->whereDate('sold_at', '<=', $endDate);

        if ($branchId !== null) {
            $salesQuery->where('branch_id', $branchId);
        }

        $summary = (clone $salesQuery)->selectRaw('count(*) as transactions, coalesce(sum(grand_total), 0) as grand_total, coalesce(sum(paid_total), 0) as paid_total')->first();

        $byBranch = (clone $salesQuery)
            ->select('branch_id', DB::raw('count(*) as transactions'), DB::raw('sum(grand_total) as total'))
            ->with('branch:id,name,code')
            ->groupBy('branch_id')
            ->get()
            ->map(fn (Sale $sale): array => [
                'branch' => $sale->branch?->name ?? 'Tanpa cabang',
                'transactions' => (int) $sale->transactions,
                'total' => (float) $sale->total,
            ])->values();

        $byCashier = (clone $salesQuery)
            ->select('user_id', DB::raw('count(*) as transactions'), DB::raw('sum(grand_total) as total'))
            ->with('user:id,name')
            ->groupBy('user_id')
            ->get()
            ->map(fn (Sale $sale): array => [
                'cashier' => $sale->user?->name ?? 'Tidak tercatat',
                'transactions' => (int) $sale->transactions,
                'total' => (float) $sale->total,
            ])->values();

        $saleIds = (clone $salesQuery)->pluck('id');
        $byProduct = SaleItem::query()
            ->whereIn('sale_id', $saleIds)
            ->select('product_id', 'product_name', DB::raw('sum(quantity) as quantity'), DB::raw('sum(line_total) as total'), DB::raw('sum(cost_total) as cost_total'))
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('total')
            ->get()
            ->map(fn (SaleItem $item): array => [
                'product' => $item->product_name,
                'quantity' => (float) $item->quantity,
                'total' => (float) $item->total,
                'cost_total' => (float) $item->cost_total,
                'gross_profit' => (float) $item->total - (float) $item->cost_total,
            ])->values();

        return Inertia::render('Reports/Sales/Index', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'branch_id' => $branchId,
            ],
            'branches' => Branch::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'code']),
            'summary' => [
                'transactions' => (int) ($summary->transactions ?? 0),
                'grand_total' => (float) ($summary->grand_total ?? 0),
                'paid_total' => (float) ($summary->paid_total ?? 0),
            ],
            'byBranch' => $byBranch,
            'byCashier' => $byCashier,
            'byProduct' => $byProduct,
        ]);
    }
}
