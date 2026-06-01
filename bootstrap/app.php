<?php

use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureSaasDomain;
use App\Http\Middleware\EnsureTenantRole;
use App\Http\Middleware\EnsureTenantSubscriptionActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectCashierToPos;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ProductionAlert;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('subscriptions:reminders')->dailyAt('08:00')->withoutOverlapping();
        $schedule->command('production:monitor --alert')->everyFiveMinutes()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO
        );

        $middleware->web(append: [
            SecurityHeaders::class,
            EnsureSaasDomain::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'cashier.redirect' => RedirectCashierToPos::class,
            'platform.admin' => EnsurePlatformAdmin::class,
            'tenant.active' => EnsureTenantSubscriptionActive::class,
            'tenant.role' => EnsureTenantRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->reportable(function (Throwable $exception): void {
            if (app()->environment('production')) {
                ProductionAlert::critical('Unhandled application exception', $exception->getMessage(), [
                    'exception' => $exception::class,
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);
            }
        });
    })->create();
