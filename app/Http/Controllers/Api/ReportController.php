<?php

namespace App\Http\Controllers\Api;

use App\Models\Sales\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends ApiController
{
    public function salesSummary(Request $request): JsonResponse
    {
        $context = $this->tenant($request);
        $tenant = $context->tenant;

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $query = Sale::where('tenant_id', $tenant->id)
            ->whereDate('sold_at', '>=', $startDate)
            ->whereDate('sold_at', '<=', $endDate);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        $summary = (clone $query)
            ->selectRaw('count(*) as total_transactions, coalesce(sum(grand_total), 0) as total_revenue')
            ->first();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total_transactions' => (int) $summary->total_transactions,
            'total_revenue' => (float) $summary->total_revenue,
        ]);
    }
}
