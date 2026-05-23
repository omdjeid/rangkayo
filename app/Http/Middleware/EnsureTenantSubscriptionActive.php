<?php

namespace App\Http\Middleware;

use App\Models\TenantSubscription;
use App\Support\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantSubscriptionActive
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = app(CurrentTenant::class)->tenant($request->user());
        $subscription = $tenant->subscription;

        if ($subscription instanceof TenantSubscription && ! $subscription->isUsable()) {
            if (! $request->routeIs('billing.*', 'profile.*', 'logout')) {
                return redirect()->route('billing.index')->with('error', 'Subscription usaha tidak aktif. Perbarui paket untuk melanjutkan.');
            }
        }

        return $next($request);
    }
}
