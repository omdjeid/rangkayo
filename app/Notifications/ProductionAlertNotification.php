<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProductionAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public readonly string $title,
        public readonly string $message,
        public readonly string $severity = 'critical',
        public readonly array $context = [],
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $_notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $_notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("[{$this->severity}] {$this->title}")
            ->greeting('Production alert')
            ->line($this->message);

        foreach ($this->context as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $mail->line("{$key}: ".(string) $value);
            }
        }

        return $mail->line('Cek log aplikasi, queue worker, dan endpoint health untuk detail lanjutan.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $_notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'severity' => $this->severity,
            'context' => $this->context,
        ];
    }
}
