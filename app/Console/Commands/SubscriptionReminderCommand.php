<?php

namespace App\Console\Commands;

use App\Actions\Tenancy\SendSubscriptionRemindersAction;
use Illuminate\Console\Command;

class SubscriptionReminderCommand extends Command
{
    protected $signature = 'subscriptions:reminders {--days=3 : Kirim reminder untuk subscription yang jatuh tempo dalam N hari}';

    protected $description = 'Mengirim email reminder trial/subscription ke owner/admin tenant.';

    public function handle(SendSubscriptionRemindersAction $sendReminders): int
    {
        $result = $sendReminders->handle(daysAhead: (int) $this->option('days'));

        $this->info("{$result['sent']} email reminder dikirim, {$result['skipped']} reminder dilewati.");

        return self::SUCCESS;
    }
}
