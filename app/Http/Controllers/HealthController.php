<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'storage' => $this->checkStorage(),
            'routes' => $this->checkRoutes(),
        ];

        $healthy = collect($checks)->every(fn (array $check): bool => $check['ok'] === true);

        return response()->json([
            'ok' => $healthy,
            'app' => config('app.name'),
            'environment' => app()->environment(),
            'timestamp' => now()->toISOString(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    /**
     * @return array{ok:bool, message:string}
     */
    private function checkDatabase(): array
    {
        try {
            DB::select('select 1');

            return ['ok' => true, 'message' => 'Database connection is available.'];
        } catch (Throwable $exception) {
            return ['ok' => false, 'message' => $exception->getMessage()];
        }
    }

    /**
     * @return array{ok:bool, message:string}
     */
    private function checkCache(): array
    {
        try {
            $key = 'health:'.str()->uuid()->toString();

            Cache::put($key, 'ok', 10);
            $ok = Cache::get($key) === 'ok';
            Cache::forget($key);

            return ['ok' => $ok, 'message' => $ok ? 'Cache store is writable.' : 'Cache store did not return the expected value.'];
        } catch (Throwable $exception) {
            return ['ok' => false, 'message' => $exception->getMessage()];
        }
    }

    /**
     * @return array{ok:bool, message:string}
     */
    private function checkStorage(): array
    {
        try {
            $path = 'health/.check';

            Storage::disk('local')->put($path, now()->toISOString());
            $ok = Storage::disk('local')->exists($path);
            Storage::disk('local')->delete($path);

            return ['ok' => $ok, 'message' => $ok ? 'Local storage is writable.' : 'Local storage write check failed.'];
        } catch (Throwable $exception) {
            return ['ok' => false, 'message' => $exception->getMessage()];
        }
    }

    /**
     * @return array{ok:bool, message:string}
     */
    private function checkRoutes(): array
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

        $missing = collect($requiredRoutes)
            ->reject(fn (string $route): bool => Route::has($route))
            ->values();

        if ($missing->isNotEmpty()) {
            return ['ok' => false, 'message' => 'Missing routes: '.$missing->implode(', ')];
        }

        return ['ok' => true, 'message' => 'Required routes are registered.'];
    }
}
