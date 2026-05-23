<?php

use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureTenantRole;
use App\Http\Middleware\EnsureTenantSubscriptionActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectCashierToPos;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
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
        //
    })->create();
