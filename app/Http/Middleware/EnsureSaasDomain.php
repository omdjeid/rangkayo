<?php

namespace App\Http\Middleware;

use App\Support\SaasDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSaasDomain
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $route = SaasDomains::intendedRouteFor($request);

        if ($route !== null && $request->route()?->getName() !== $route) {
            return redirect()->route($route);
        }

        return $next($request);
    }
}
