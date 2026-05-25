<?php

namespace Tests\Feature;

use App\Models\ProductionMetric;
use App\Notifications\ProductionAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProductionMonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_includes_queue_check(): void
    {
        $this->getJson(route('health'))
            ->assertOk()
            ->assertJsonPath('checks.queue.ok', true);
    }

    public function test_production_monitor_records_metrics(): void
    {
        config(['monitoring.log_error_threshold' => 999999]);

        $this->artisan('production:monitor')
            ->assertExitCode(0);

        $this->assertDatabaseHas('production_metrics', ['name' => 'database.up', 'status' => 'ok']);
        $this->assertDatabaseHas('production_metrics', ['name' => 'queue.failed_jobs', 'status' => 'ok']);
        $this->assertTrue(ProductionMetric::query()->where('name', 'logs.recent_errors')->exists());
    }

    public function test_production_monitor_alerts_on_failed_jobs(): void
    {
        Notification::fake();
        config([
            'monitoring.alert_email' => 'ops@example.test',
            'monitoring.log_error_threshold' => 999999,
        ]);

        DB::table('failed_jobs')->insert([
            'uuid' => (string) str()->uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'failed test job',
            'failed_at' => now(),
        ]);

        $this->artisan('production:monitor --alert')
            ->assertExitCode(1);

        $this->assertDatabaseHas('production_metrics', ['name' => 'queue.failed_jobs', 'status' => 'critical']);
        Notification::assertSentOnDemand(ProductionAlertNotification::class);
    }
}
