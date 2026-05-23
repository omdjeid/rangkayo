<?php

namespace App\Console\Commands;

use App\Models\PlatformAuditLog;
use App\Models\TenantSubscription;
use Illuminate\Console\Command;

class SubscriptionReminderCommand extends Command
{
    protected $signature = 'subscriptions:reminders';

    protected $description = 'Mencatat reminder trial/subscription yang perlu dikirim email.';

    public function handle(): int
    {
        $subscriptions = TenantSubscription::query()
            ->with('tenant')
            ->whereIn('status', ['trial', 'active'])
            ->where(function ($query): void {
                $query->whereDate('trial_ends_at', '<=', now()->addDays(3))
                    ->orWhereDate('current_period_ends_at', '<=', now()->addDays(3));
            })
            ->get();

        foreach ($subscriptions as $subscription) {
            PlatformAuditLog::query()->create([
                'tenant_id' => $subscription->tenant_id,
                'action' => 'subscription.reminder.pending',
                'description' => "Reminder subscription {$subscription->tenant?->name} perlu dikirim.",
                'metadata' => $subscription->toArray(),
            ]);
        }

        $this->info("{$subscriptions->count()} reminder dicatat.");

        return self::SUCCESS;
    }
}
