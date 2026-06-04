<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'plan_code',
        'plan_name',
        'monthly_price',
        'status',
        'user_limit',
        'branch_limit',
        'transaction_limit',
        'trial_ends_at',
        'current_period_starts_at',
        'current_period_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'date',
            'current_period_starts_at' => 'date',
            'current_period_ends_at' => 'date',
            'monthly_price' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['trial', 'active'], true);
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired'
            || ($this->current_period_ends_at && $this->current_period_ends_at->isPast());
    }

    public function isUsable(): bool
    {
        return $this->isActive()
            && ($this->current_period_ends_at === null || $this->current_period_ends_at->isFuture());
    }

    public function trialDaysRemaining(): ?int
    {
        if ($this->status !== 'trial' || !$this->trial_ends_at) {
            return null;
        }

        return max(0, now()->diffInDays($this->trial_ends_at, false));
    }
}
