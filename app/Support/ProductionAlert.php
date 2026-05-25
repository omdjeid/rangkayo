<?php

namespace App\Support;

use App\Notifications\ProductionAlertNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ProductionAlert
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function critical(string $title, string $message, array $context = []): void
    {
        Log::critical($title, ['message' => $message, ...$context]);

        $email = config('monitoring.alert_email');

        if (! is_string($email) || $email === '') {
            return;
        }

        Notification::route('mail', $email)
            ->notify(new ProductionAlertNotification($title, $message, 'critical', $context));
    }
}
