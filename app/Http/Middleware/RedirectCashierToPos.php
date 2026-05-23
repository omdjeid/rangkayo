<?php

namespace App\Http\Middleware;

use App\Support\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectCashierToPos
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('pos.*') && app(CurrentTenant::class)->context($request->user())->isCashierOnly()) {
            return redirect()->route('pos.index');
        }

        return $next($request);
    }
}
