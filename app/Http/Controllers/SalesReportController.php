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
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function export(Request $request, CurrentTenant $currentTenant): StreamedResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $branch = $currentTenant->branch($tenant);
        $startDate = $request->date('start_date')?->toDateString() ?? now()->startOfMonth()->toDateString();
        $endDate = $request->date('end_date')?->toDateString() ?? now()->toDateString();
        $branchId = $context->isBranchScoped() ? $branch->id : ($request->integer('branch_id') ?: null);
        $type = $request->get('type', 'transactions'); // 'transactions' or 'products'

        $salesQuery = Sale::query()
            ->where('tenant_id', $tenant->id)
            ->whereDate('sold_at', '>=', $startDate)
            ->whereDate('sold_at', '<=', $endDate);

        if ($branchId !== null) {
            $salesQuery->where('branch_id', $branchId);
        }

        if ($type === 'products') {
            return $this->exportProducts($salesQuery, $startDate, $endDate);
        }

        return $this->exportTransactions($salesQuery, $startDate, $endDate);
    }

    private function exportTransactions($salesQuery, string $startDate, string $endDate): StreamedResponse
    {
        $sales = (clone $salesQuery)
            ->with(['branch:id,name,code', 'user:id,name'])
            ->orderBy('sold_at')
            ->get();

        $filename = "laporan-penjualan-{$startDate}-{$endDate}.csv";
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($sales) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");
            // Header row
            fputcsv($handle, ['Tanggal', 'No. Transaksi', 'Kasir', 'Cabang', 'Metode Bayar', 'Total', 'Dibayar', 'Kembalian']);
            foreach ($sales as $sale) {
                fputcsv($handle, [
                    $sale->sold_at->format('Y-m-d H:i'),
                    $sale->sale_number,
                    $sale->user?->name ?? 'Tidak tercatat',
                    $sale->branch?->name ?? 'Tanpa cabang',
                    $sale->payment_method,
                    number_format($sale->grand_total, 2, ',', '.'),
                    number_format($sale->paid_total, 2, ',', '.'),
                    number_format($sale->change_total, 2, ',', '.'),
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }

    private function exportProducts($salesQuery, string $startDate, string $endDate): StreamedResponse
    {
        $saleIds = (clone $salesQuery)->pluck('id');
        $products = SaleItem::query()
            ->whereIn('sale_id', $saleIds)
            ->select('product_name', DB::raw('sum(quantity) as quantity'), DB::raw('sum(line_total) as total'), DB::raw('sum(cost_total) as cost_total'))
            ->groupBy('product_name')
            ->orderByDesc('total')
            ->get();

        $filename = "laporan-produk-{$startDate}-{$endDate}.csv";
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($products) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");
            // Header row
            fputcsv($handle, ['Produk', 'Qty', 'Total', 'Modal', 'Laba']);
            foreach ($products as $item) {
                $grossProfit = (float) $item->total - (float) $item->cost_total;
                fputcsv($handle, [
                    $item->product_name,
                    number_format($item->quantity, 2, ',', '.'),
                    number_format($item->total, 2, ',', '.'),
                    number_format($item->cost_total, 2, ',', '.'),
                    number_format($grossProfit, 2, ',', '.'),
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}
