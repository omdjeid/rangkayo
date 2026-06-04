<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Models\User;
use App\Support\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlanLimits
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        try {
            $context = app(CurrentTenant::class)->context($user);
            $tenant = $context->tenant;
            $subscription = $tenant->subscription;

            if (!$subscription || !$subscription->isUsable()) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Subscription expired. Please upgrade.'], 403);
                }
                return redirect()->route('billing.index')->with('error', 'Langganan Anda sudah berakhir. Silakan upgrade.');
            }

            // Check user limit
            $userCount = User::whereHas('tenants', fn ($q) => $q->where('tenant_id', $tenant->id))->count();
            if ($userCount > $subscription->user_limit) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'User limit exceeded for your plan.'], 403);
                }
                return redirect()->route('billing.index')->with('error', 'Batas user untuk paket Anda terlampaui.');
            }

            // Check branch limit
            $branchCount = Branch::where('tenant_id', $tenant->id)->count();
            if ($branchCount > $subscription->branch_limit) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Branch limit exceeded for your plan.'], 403);
                }
                return redirect()->route('billing.index')->with('error', 'Batas cabang untuk paket Anda terlampaui.');
            }
        } catch (\Exception) {
            // If tenant context fails, let the request through
        }

        return $next($request);
    }
}
