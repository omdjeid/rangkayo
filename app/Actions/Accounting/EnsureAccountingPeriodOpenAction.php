<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\AccountingPeriod;
use App\Models\Branch;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

class EnsureAccountingPeriodOpenAction
{
    public function handle(Tenant $tenant, ?Branch $branch, string $date): void
    {
        $entryDate = CarbonImmutable::parse($date)->toDateString();

        $lockedPeriod = AccountingPeriod::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'locked')
            ->whereDate('starts_on', '<=', $entryDate)
            ->whereDate('ends_on', '>=', $entryDate)
            ->where(function ($query) use ($branch): void {
                $query->whereNull('branch_id');

                if ($branch instanceof Branch) {
                    $query->orWhere('branch_id', $branch->id);
                }
            })
            ->orderByRaw('branch_id is null')
            ->first();

        if ($lockedPeriod instanceof AccountingPeriod) {
            throw new InvalidArgumentException("Periode akuntansi {$lockedPeriod->name} sudah dikunci. Transaksi tanggal {$entryDate} tidak bisa diposting.");
        }
    }
}
