<?php

namespace App\Actions\Sales;

use App\Actions\Accounting\RecordAuditLogAction;
use App\Models\Branch;
use App\Models\Sales\CashierShift;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OpenCashierShiftAction
{
    public function handle(Tenant $tenant, Branch $branch, Warehouse $warehouse, User $user, float $openingCash = 0, ?string $notes = null): CashierShift
    {
        if ($branch->tenant_id !== $tenant->id || $warehouse->tenant_id !== $tenant->id || $warehouse->branch_id !== $branch->id) {
            throw new InvalidArgumentException('Cabang atau gudang tidak sesuai tenant.');
        }

        $openShift = CashierShift::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if ($openShift instanceof CashierShift) {
            return $openShift;
        }

        return DB::transaction(function () use ($tenant, $branch, $warehouse, $user, $openingCash, $notes): CashierShift {
            /** @var CashierShift $shift */
            $shift = CashierShift::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'warehouse_id' => $warehouse->id,
                'user_id' => $user->id,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
                'expected_cash' => $openingCash,
                'status' => 'open',
                'opening_notes' => $notes,
            ]);

            app(RecordAuditLogAction::class)->handle(
                tenant: $tenant,
                branch: $branch,
                user: $user,
                action: 'cashier_shift.opened',
                description: "Shift kasir #{$shift->id} dibuka.",
                auditable: $shift,
                newValues: $shift->toArray(),
            );

            return $shift;
        });
    }
}
