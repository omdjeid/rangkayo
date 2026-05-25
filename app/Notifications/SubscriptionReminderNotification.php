<?php

namespace App\Notifications;

use App\Models\TenantSubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly TenantSubscription $subscription,
        public readonly string $kind,
        public readonly int $daysRemaining,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $tenantName = $this->subscription->tenant?->name ?? 'workspace Anda';
        $subject = match ($this->kind) {
            'trial_ending' => "Trial {$tenantName} segera berakhir",
            'subscription_expiring' => "Subscription {$tenantName} segera jatuh tempo",
            'subscription_expired' => "Subscription {$tenantName} sudah berakhir",
            default => "Reminder subscription {$tenantName}",
        };
        $message = match ($this->kind) {
            'trial_ending' => "Trial {$tenantName} akan berakhir dalam {$this->daysRemaining} hari.",
            'subscription_expiring' => "Periode subscription {$tenantName} akan jatuh tempo dalam {$this->daysRemaining} hari.",
            'subscription_expired' => "Subscription {$tenantName} sudah melewati tanggal aktif. Beberapa fitur tenant dapat dibatasi.",
            default => "Ada reminder subscription untuk {$tenantName}.",
        };

        return (new MailMessage)
            ->subject($subject)
            ->greeting('Halo,')
            ->line($message)
            ->line('Silakan cek halaman Paket & Billing untuk memperpanjang atau menyesuaikan paket.')
            ->action('Buka Billing', route('billing.index'))
            ->line('Terima kasih sudah menggunakan '.config('app.name').'.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'tenant_id' => $this->subscription->tenant_id,
            'kind' => $this->kind,
            'days_remaining' => $this->daysRemaining,
            'status' => $this->subscription->status,
        ];
    }
}
