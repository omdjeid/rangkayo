<?php

namespace App\Actions\Accounting;

use App\Models\Accounting\FixedAsset;
use App\Models\Accounting\FixedAssetDepreciation;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PostFixedAssetDepreciationAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    public function handle(FixedAsset $asset, string $depreciationDate): FixedAssetDepreciation
    {
        if ($asset->status !== 'active') {
            throw new InvalidArgumentException('Hanya aset aktif yang bisa disusutkan.');
        }

        $depreciableAmount = (float) $asset->acquisition_cost - (float) $asset->salvage_value;
        $remaining = round($depreciableAmount - (float) $asset->accumulated_depreciation, 2);

        if ($remaining <= 0) {
            throw new InvalidArgumentException('Aset sudah selesai disusutkan.');
        }

        $amount = min((float) $asset->monthly_depreciation, $remaining);

        return DB::transaction(function () use ($asset, $depreciationDate, $amount): FixedAssetDepreciation {
            $locked = FixedAsset::query()->lockForUpdate()->findOrFail($asset->id);

            if (FixedAssetDepreciation::query()->where('fixed_asset_id', $locked->id)->whereDate('depreciation_date', $depreciationDate)->exists()) {
                throw new InvalidArgumentException('Penyusutan untuk tanggal ini sudah diposting.');
            }

            $number = 'DEP-'.$locked->asset_number.'-'.str_replace('-', '', $depreciationDate);
            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $locked->tenant_id,
                'branch_id' => $locked->branch_id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => $depreciationDate,
                'source_type' => 'fixed_asset_depreciation',
                'description' => 'Penyusutan aset '.$locked->name,
            ], [
                ['account_id' => $locked->depreciation_expense_account_id, 'debit' => $amount, 'credit' => 0, 'description' => 'Beban penyusutan'],
                ['account_id' => $locked->accumulated_depreciation_account_id, 'debit' => 0, 'credit' => $amount, 'description' => 'Akumulasi penyusutan'],
            ]);

            $accumulatedAfter = round((float) $locked->accumulated_depreciation + $amount, 2);

            /** @var FixedAssetDepreciation $depreciation */
            $depreciation = FixedAssetDepreciation::query()->create([
                'tenant_id' => $locked->tenant_id,
                'fixed_asset_id' => $locked->id,
                'journal_entry_id' => $journalEntry->id,
                'depreciation_date' => $depreciationDate,
                'amount' => $amount,
                'accumulated_after' => $accumulatedAfter,
            ]);

            $locked->update([
                'accumulated_depreciation' => $accumulatedAfter,
                'last_depreciated_at' => $depreciationDate,
                'status' => $accumulatedAfter >= ((float) $locked->acquisition_cost - (float) $locked->salvage_value) ? 'fully_depreciated' : 'active',
            ]);

            return $depreciation->load(['fixedAsset', 'journalEntry.lines.account']);
        });
    }
}
