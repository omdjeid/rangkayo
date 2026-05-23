<?php

namespace App\Actions\Sales;

use App\Actions\Accounting\RecordAuditLogAction;
use App\Models\Sales\CashierShift;
use App\Models\Sales\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CloseCashierShiftAction
{
    public function handle(CashierShift $shift, User $user, float $actualCash, ?string $notes = null): CashierShift
    {
        if (! $shift->isOpen()) {
            throw new InvalidArgumentException('Shift kasir sudah ditutup.');
        }

        return DB::transaction(function () use ($shift, $user, $actualCash, $notes): CashierShift {
            $cashSales = (float) Sale::query()
                ->where('tenant_id', $shift->tenant_id)
                ->where('cashier_shift_id', $shift->id)
                ->where('payment_method', 'cash')
                ->sum('grand_total');

            $expectedCash = (float) $shift->opening_cash + $cashSales;

            $shift->update([
                'closed_at' => now(),
                'expected_cash' => $expectedCash,
                'actual_cash' => $actualCash,
                'cash_difference' => $actualCash - $expectedCash,
                'status' => 'closed',
                'closing_notes' => $notes,
            ]);

            app(RecordAuditLogAction::class)->handle(
                tenant: $shift->tenant,
                branch: $shift->branch,
                user: $user,
                action: 'cashier_shift.closed',
                description: "Shift kasir #{$shift->id} ditutup.",
                auditable: $shift,
                newValues: $shift->fresh()->toArray(),
            );

            return $shift->fresh(['sales', 'user', 'branch']);
        });
    }
}
