<?php

namespace Tests\Feature;

use App\Actions\Tenancy\SendSubscriptionRemindersAction;
use App\Models\PlatformAuditLog;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Notifications\SubscriptionReminderNotification;
use App\Notifications\TenantInvitationNotification;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_invitation_sends_email_notification(): void
    {
        Notification::fake();
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();

        $this->actingAs($user)
            ->post(route('tenant-invitations.store'), [
                'name' => 'Kasir Baru',
                'email' => 'kasir-baru@example.test',
                'role' => 'cashier',
                'branch_id' => $branch->id,
            ])
            ->assertRedirect();

        Notification::assertSentOnDemand(TenantInvitationNotification::class, function (TenantInvitationNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool {
            return $channels === ['mail']
                && $notifiable->routeNotificationFor('mail') === 'kasir-baru@example.test'
                && $notification->invitation->email === 'kasir-baru@example.test';
        });
    }

    public function test_subscription_reminder_command_sends_email_to_owner_and_deduplicates(): void
    {
        Notification::fake();
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $owner = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $subscription = TenantSubscription::query()->where('tenant_id', $tenant->id)->firstOrFail();
        $subscription->update([
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(2),
            'current_period_ends_at' => now()->addMonth(),
        ]);

        $result = app(SendSubscriptionRemindersAction::class)->handle(daysAhead: 3);

        $this->assertSame(['sent' => 1, 'skipped' => 0], $result);
        Notification::assertSentTo($owner, SubscriptionReminderNotification::class, function (SubscriptionReminderNotification $notification): bool {
            return $notification->kind === 'trial_ending'
                && $notification->daysRemaining === 2;
        });
        $this->assertDatabaseHas('platform_audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'subscription.reminder.sent',
        ]);

        Notification::fake();
        $secondResult = app(SendSubscriptionRemindersAction::class)->handle(daysAhead: 3);

        $this->assertSame(['sent' => 0, 'skipped' => 1], $secondResult);
        Notification::assertNothingSent();
        $this->assertSame(1, PlatformAuditLog::query()->where('tenant_id', $tenant->id)->where('action', 'subscription.reminder.sent')->count());
    }
}
