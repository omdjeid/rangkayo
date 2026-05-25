<?php

namespace App\Notifications;

use App\Models\TenantInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly TenantInvitation $invitation) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $tenantName = $this->invitation->tenant?->name ?? config('app.name');
        $expiresAt = $this->invitation->expires_at?->timezone(config('app.timezone'))->translatedFormat('d M Y H:i') ?? '7 hari';

        return (new MailMessage)
            ->subject("Undangan bergabung ke {$tenantName}")
            ->greeting('Halo '.($this->invitation->name ?: $this->invitation->email).',')
            ->line("Anda diundang untuk bergabung ke workspace {$tenantName} sebagai {$this->invitation->role}.")
            ->line("Undangan ini berlaku sampai {$expiresAt}.")
            ->action('Terima Undangan', route('invitations.accept', $this->invitation->token))
            ->line('Jika Anda tidak mengenal undangan ini, abaikan email ini.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'tenant_id' => $this->invitation->tenant_id,
            'email' => $this->invitation->email,
            'role' => $this->invitation->role,
        ];
    }
}
