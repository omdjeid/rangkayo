<?php

namespace App\Models\Accounting;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FixedAssetDepreciation extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'fixed_asset_id',
        'journal_entry_id',
        'depreciation_date',
        'amount',
        'accumulated_after',
    ];

    protected function casts(): array
    {
        return [
            'depreciation_date' => 'date',
            'amount' => 'decimal:2',
            'accumulated_after' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
