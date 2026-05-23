<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SmokeCheckCommand extends Command
{
    protected $signature = 'app:smoke-check {--url= : Base URL untuk cek HTTP publik setelah deploy} {--require-build : Gagalkan check jika manifest asset production belum ada}';

    protected $description = 'Menjalankan smoke/readiness check untuk database, cache, storage, route penting, asset build, dan endpoint publik opsional.';

    /**
     * @var array<int, string>
     */
    private array $failures = [];

    public function handle(): int
    {
        $this->info('Menjalankan smoke check Akutansia...');

        $this->check('Database connection', fn (): bool => (bool) DB::select('select 1'));
        $this->check('Cache store writable', function (): bool {
            $key = 'smoke:'.str()->uuid()->toString();
            Cache::put($key, 'ok', 10);
            $ok = Cache::get($key) === 'ok';
            Cache::forget($key);

            return $ok;
        });
        $this->check('Local storage writable', function (): bool {
            $path = 'smoke/.check';
            Storage::disk('local')->put($path, now()->toISOString());
            $ok = Storage::disk('local')->exists($path);
            Storage::disk('local')->delete($path);

            return $ok;
        });
        $this->check('Required routes registered', fn (): bool => $this->requiredRoutesAreRegistered());
        $this->check('Tenant data available', fn (): bool => Tenant::query()->exists());

        if ($this->option('require-build')) {
            $this->check('Production asset manifest available', fn (): bool => file_exists(public_path('build/manifest.json')));
        }

        if ($this->option('url')) {
            $this->checkPublicEndpoints(rtrim((string) $this->option('url'), '/'));
        }

        if ($this->failures !== []) {
            $this->error('Smoke check gagal:');

            foreach ($this->failures as $failure) {
                $this->line("- {$failure}");
            }

            return self::FAILURE;
        }

        $this->info('Smoke check berhasil.');

        return self::SUCCESS;
    }

    private function check(string $label, callable $callback): void
    {
        try {
            if ($callback() === true) {
                $this->components->info($label);

                return;
            }

            $this->failures[] = $label;
            $this->components->error($label);
        } catch (Throwable $exception) {
            $this->failures[] = $label.': '.$exception->getMessage();
            $this->components->error($label);
        }
    }

    private function requiredRoutesAreRegistered(): bool
    {
        $requiredRoutes = [
            'login',
            'dashboard',
            'pos.index',
            'cash-transactions.index',
            'reports.sales',
            'reports.profit-loss',
            'reports.balance-sheet',
        ];

        return collect($requiredRoutes)->every(fn (string $route): bool => Route::has($route));
    }

    private function checkPublicEndpoints(string $baseUrl): void
    {
        foreach (['/', '/login', '/health'] as $path) {
            $this->check("HTTP {$path}", function () use ($baseUrl, $path): bool {
                $response = Http::timeout(10)->get($baseUrl.$path);

                return $response->successful();
            });
        }
    }
}
