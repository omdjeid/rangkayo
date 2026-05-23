<?php

namespace App\Http\Middleware;

use App\Support\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantRole
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $context = app(CurrentTenant::class)->context($request->user());

        if ($roles !== [] && ! $context->hasAnyRole($roles)) {
            abort(403, 'Role Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }
}
