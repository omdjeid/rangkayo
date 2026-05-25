<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\Account;
use App\Models\Accounting\FixedAsset;
use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateFixedAssetAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(Tenant $tenant, ?Branch $branch, string $name, string $acquiredAt, string $depreciationStartedAt, float $acquisitionCost, float $salvageValue, int $usefulLifeMonths, ?string $notes = null): FixedAsset
    {
        if ($acquisitionCost <= 0) {
            throw new InvalidArgumentException('Nilai perolehan aset harus lebih dari 0.');
        }

        if ($salvageValue < 0 || $salvageValue >= $acquisitionCost) {
            throw new InvalidArgumentException('Nilai residu harus lebih kecil dari nilai perolehan.');
        }

        if ($usefulLifeMonths < 1) {
            throw new InvalidArgumentException('Umur manfaat minimal 1 bulan.');
        }

        return DB::transaction(function () use ($tenant, $branch, $name, $acquiredAt, $depreciationStartedAt, $acquisitionCost, $salvageValue, $usefulLifeMonths, $notes): FixedAsset {
            $assetAccount = $this->account($tenant, '1050');
            $accumulatedAccount = $this->account($tenant, '1060');
            $expenseAccount = $this->account($tenant, '6050');
            $cashAccount = $this->account($tenant, $tenant->default_bank_account_code ?: '1020');
            $number = 'FA-'.now()->format('YmdHis');
            $monthlyDepreciation = round(($acquisitionCost - $salvageValue) / $usefulLifeMonths, 2);

            $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $acquiredAt,
                'source_type' => 'fixed_asset',
                'description' => 'Perolehan aset tetap '.$name,
            ], [
                ['account_id' => $assetAccount->id, 'debit' => $acquisitionCost, 'credit' => 0, 'description' => 'Perolehan aset tetap'],
                ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $acquisitionCost, 'description' => 'Pembayaran aset tetap'],
            ]);

            /** @var FixedAsset $asset */
            $asset = FixedAsset::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch?->id,
                'asset_account_id' => $assetAccount->id,
                'accumulated_depreciation_account_id' => $accumulatedAccount->id,
                'depreciation_expense_account_id' => $expenseAccount->id,
                'asset_number' => $number,
                'name' => $name,
                'acquired_at' => $acquiredAt,
                'depreciation_started_at' => $depreciationStartedAt,
                'acquisition_cost' => $acquisitionCost,
                'salvage_value' => $salvageValue,
                'useful_life_months' => $usefulLifeMonths,
                'monthly_depreciation' => $monthlyDepreciation,
                'accumulated_depreciation' => 0,
                'status' => 'active',
                'notes' => $notes,
            ]);

            return $asset->load(['branch', 'assetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount']);
        });
    }

    private function account(Tenant $tenant, string $code): Account
    {
        $account = $tenant->accounts()->where('code', $code)->first();

        if (! $account instanceof Account) {
            throw new InvalidArgumentException("Akun {$code} belum tersedia.");
        }

        return $account;
    }
}
