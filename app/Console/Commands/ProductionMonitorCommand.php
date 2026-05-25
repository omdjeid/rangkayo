<?php

namespace App\Console\Commands;

use App\Models\ProductionMetric;
use App\Support\ProductionAlert;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ProductionMonitorCommand extends Command
{
    protected $signature = 'production:monitor {--url=* : URL yang dicek untuk uptime} {--alert : Kirim alert jika status critical}';

    protected $description = 'Mengumpulkan metric produksi: failed queue, ukuran queue, error log, database, dan uptime URL.';

    /**
     * @var array<int, array{name:string, value:float, status:string, context:array<string, mixed>}>
     */
    private array $metrics = [];

    public function handle(): int
    {
        $this->collectDatabaseMetric();
        $this->collectQueueMetrics();
        $this->collectLogMetrics();
        $this->collectUptimeMetrics($this->urls());

        foreach ($this->metrics as $metric) {
            ProductionMetric::query()->create([
                'name' => $metric['name'],
                'value' => $metric['value'],
                'status' => $metric['status'],
                'context' => $metric['context'],
                'measured_at' => now(),
            ]);

            $this->line("{$metric['status']} {$metric['name']}={$metric['value']}");
        }

        $critical = collect($this->metrics)->where('status', 'critical')->values();

        if ($critical->isNotEmpty() && $this->option('alert')) {
            ProductionAlert::critical(
                'Production monitoring critical',
                $critical->pluck('name')->implode(', ').' membutuhkan perhatian.',
                ['metrics' => $critical->all()],
            );
        }

        return $critical->isEmpty() ? self::SUCCESS : self::FAILURE;
    }

    private function collectDatabaseMetric(): void
    {
        try {
            DB::select('select 1');
            $this->metric('database.up', 1, 'ok');
        } catch (Throwable $exception) {
            $this->metric('database.up', 0, 'critical', ['error' => $exception->getMessage()]);
        }
    }

    private function collectQueueMetrics(): void
    {
        $failed = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;
        $pending = Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0;
        $threshold = (int) config('monitoring.queue_failed_threshold', 1);

        $this->metric('queue.failed_jobs', (float) $failed, $failed >= $threshold ? 'critical' : 'ok', [
            'threshold' => $threshold,
        ]);
        $this->metric('queue.pending_jobs', (float) $pending, $pending > 0 ? 'warning' : 'ok');
    }

    private function collectLogMetrics(): void
    {
        $path = storage_path('logs/laravel.log');
        $count = 0;

        if (is_file($path)) {
            $handle = fopen($path, 'rb');

            if ($handle !== false) {
                fseek($handle, max(0, filesize($path) - 512000));

                while (($line = fgets($handle)) !== false) {
                    if (str_contains($line, '.ERROR') || str_contains($line, '.CRITICAL') || str_contains($line, '.ALERT') || str_contains($line, '.EMERGENCY')) {
                        $count++;
                    }
                }

                fclose($handle);
            }
        }

        $threshold = (int) config('monitoring.log_error_threshold', 1);
        $this->metric('logs.recent_errors', (float) $count, $count >= $threshold ? 'critical' : 'ok', [
            'threshold' => $threshold,
            'window' => 'last_512kb',
        ]);
    }

    /**
     * @param  array<int, string>  $urls
     */
    private function collectUptimeMetrics(array $urls): void
    {
        foreach ($urls as $url) {
            try {
                $response = Http::timeout(10)->get($url);
                $this->metric('uptime.http', $response->status(), $response->successful() ? 'ok' : 'critical', [
                    'url' => $url,
                ]);
            } catch (Throwable $exception) {
                $this->metric('uptime.http', 0, 'critical', [
                    'url' => $url,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function urls(): array
    {
        $urls = $this->option('url');

        if (is_array($urls) && $urls !== []) {
            return array_values(array_filter(array_map('strval', $urls)));
        }

        return config('monitoring.uptime_urls', []);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function metric(string $name, float $value, string $status, array $context = []): void
    {
        $this->metrics[] = compact('name', 'value', 'status', 'context');
    }
}
