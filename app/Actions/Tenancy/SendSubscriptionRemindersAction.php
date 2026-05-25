<?php

namespace App\Actions\Tenancy;

use App\Models\PlatformAuditLog;
use App\Models\TenantSubscription;
use App\Notifications\SubscriptionReminderNotification;
use App\Support\TenantNotificationRecipients;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

class SendSubscriptionRemindersAction
{
    /**
     * @return array{sent:int, skipped:int}
     */
    public function handle(int $daysAhead = 3): array
    {
        $sent = 0;
        $skipped = 0;
        $now = CarbonImmutable::now()->startOfDay();
        $until = $now->addDays($daysAhead)->endOfDay();

        $subscriptions = TenantSubscription::query()
            ->with(['tenant.users'])
            ->whereIn('status', ['trial', 'active', 'expired'])
            ->where(function ($query) use ($now, $until): void {
                $query->whereBetween('trial_ends_at', [$now, $until])
                    ->orWhereBetween('current_period_ends_at', [$now, $until])
                    ->orWhere('current_period_ends_at', '<', $now);
            })
            ->get();

        foreach ($subscriptions as $subscription) {
            $kind = $this->kind($subscription);
            $targetAt = $this->targetAt($subscription, $kind);

            if ($targetAt === null || $this->alreadySent($subscription, $kind, $targetAt)) {
                $skipped++;

                continue;
            }

            $recipients = TenantNotificationRecipients::billingRecipients($subscription->tenant);

            if ($recipients->isEmpty()) {
                $skipped++;
                $this->audit($subscription, $kind, $targetAt, 0, 'subscription.reminder.skipped');

                continue;
            }

            Notification::send($recipients, new SubscriptionReminderNotification(
                subscription: $subscription,
                kind: $kind,
                daysRemaining: max(0, (int) $now->diffInDays(CarbonImmutable::parse($targetAt)->startOfDay(), absolute: false)),
            ));

            $this->audit($subscription, $kind, $targetAt, $recipients->count(), 'subscription.reminder.sent');
            $sent += $recipients->count();
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }

    private function kind(TenantSubscription $subscription): string
    {
        if ($subscription->status === 'trial' && $subscription->trial_ends_at !== null && $subscription->trial_ends_at->isFuture()) {
            return 'trial_ending';
        }

        if ($subscription->current_period_ends_at !== null && $subscription->current_period_ends_at->isPast()) {
            return 'subscription_expired';
        }

        return 'subscription_expiring';
    }

    private function targetAt(TenantSubscription $subscription, string $kind): ?Carbon
    {
        if ($kind === 'trial_ending') {
            return $subscription->trial_ends_at;
        }

        return $subscription->current_period_ends_at;
    }

    private function alreadySent(TenantSubscription $subscription, string $kind, DateTimeInterface $targetAt): bool
    {
        return PlatformAuditLog::query()
            ->where('tenant_id', $subscription->tenant_id)
            ->where('action', 'subscription.reminder.sent')
            ->where('metadata->kind', $kind)
            ->where('metadata->target_at', CarbonImmutable::parse($targetAt)->toDateString())
            ->exists();
    }

    private function audit(TenantSubscription $subscription, string $kind, DateTimeInterface $targetAt, int $recipientCount, string $action): void
    {
        PlatformAuditLog::query()->create([
            'tenant_id' => $subscription->tenant_id,
            'action' => $action,
            'description' => "Reminder {$kind} untuk {$subscription->tenant?->name} diproses.",
            'metadata' => [
                'subscription_id' => $subscription->id,
                'kind' => $kind,
                'target_at' => CarbonImmutable::parse($targetAt)->toDateString(),
                'recipient_count' => $recipientCount,
                'status' => $subscription->status,
            ],
        ]);
    }
}
