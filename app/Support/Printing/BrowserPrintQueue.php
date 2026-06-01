<?php

namespace App\Support\Printing;

use App\Models\Sales\Sale;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class BrowserPrintQueue
{
    /**
     * Push a sale receipt job into the browser print queue.
     *
     * @return string The unique print-job ID.
     */
    public function pushReceipt(Sale $sale): string
    {
        $sale->loadMissing(['items', 'branch', 'warehouse', 'user']);

        $jobId = (string) Str::uuid();
        $tenantId = $sale->tenant_id;

        $job = [
            'id'             => $jobId,
            'type'           => 'receipt',
            'sale_id'        => $sale->id,
            'sale_number'    => $sale->sale_number,
            'sold_at'        => $sale->sold_at?->toDateTimeString(),
            'payment_method' => $sale->payment_method,
            'subtotal'       => (float) $sale->subtotal,
            'discount_total' => (float) $sale->discount_total,
            'tax_total'      => (float) $sale->tax_total,
            'grand_total'    => (float) $sale->grand_total,
            'paid_total'     => (float) $sale->paid_total,
            'change_total'   => (float) $sale->change_total,
            'cashier'        => $sale->user?->name,
            'branch'         => [
                'name'    => $sale->branch?->name,
                'code'    => $sale->branch?->code,
                'phone'   => $sale->branch?->phone,
                'address' => $sale->branch?->address,
            ],
            'items' => $sale->items->map(fn ($item): array => [
                'product_name'   => $item->product_name,
                'quantity'       => (float) $item->quantity,
                'unit_price'     => (float) $item->unit_price,
                'discount_total' => (float) $item->discount_total,
                'line_total'     => (float) $item->line_total,
            ])->values()->all(),
            'created_at' => now()->toDateTimeString(),
        ];

        $key = $this->queueKey($tenantId);

        $jobs = Cache::get($key, []);
        $jobs[] = $job;
        Cache::put($key, $jobs, now()->addMinutes(30));

        return $jobId;
    }

    /**
     * Pull (consume) all pending jobs for a tenant.
     *
     * @return array<int, array<string, mixed>>
     */
    public function pull(int $tenantId): array
    {
        $key = $this->queueKey($tenantId);

        $jobs = Cache::pull($key, []);

        return is_array($jobs) ? $jobs : [];
    }

    /**
     * Number of pending jobs for a tenant.
     */
    public function pending(int $tenantId): int
    {
        $jobs = Cache::get($this->queueKey($tenantId), []);

        return is_array($jobs) ? count($jobs) : 0;
    }

    protected function queueKey(int $tenantId): string
    {
        return "tenant:{$tenantId}:print_queue";
    }
}
