<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\AccountingPeriod;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LockAccountingPeriodAction
{
    public function handle(Tenant $tenant, ?Branch $branch, string $startsOn, string $endsOn, User $user, ?string $notes = null): AccountingPeriod
    {
        $startDate = CarbonImmutable::parse($startsOn)->startOfDay();
        $endDate = CarbonImmutable::parse($endsOn)->startOfDay();

        if ($endDate->lt($startDate)) {
            throw new InvalidArgumentException('Tanggal akhir periode tidak boleh sebelum tanggal awal.');
        }

        return DB::transaction(function () use ($tenant, $branch, $startDate, $endDate, $user, $notes): AccountingPeriod {
            /** @var AccountingPeriod $period */
            $period = AccountingPeriod::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'name' => $this->periodName($startDate, $endDate, $branch),
                'starts_on' => $startDate->toDateString(),
                'ends_on' => $endDate->toDateString(),
                'status' => 'locked',
                'locked_at' => now(),
                'locked_by' => $user->id,
                'notes' => $notes,
            ]);

            app(RecordAuditLogAction::class)->handle(
                tenant: $tenant,
                branch: $branch,
                user: $user,
                action: 'accounting_period.locked',
                description: "Periode {$period->name} dikunci.",
                auditable: $period,
                newValues: $period->toArray(),
            );

            return $period->load(['branch:id,name', 'lockedBy:id,name']);
        });
    }

    private function periodName(CarbonImmutable $startDate, CarbonImmutable $endDate, ?Branch $branch): string
    {
        $name = $startDate->translatedFormat('d M Y').' - '.$endDate->translatedFormat('d M Y');

        if ($branch instanceof Branch) {
            return $name.' · '.$branch->name;
        }

        return $name.' · Semua cabang';
    }
}
