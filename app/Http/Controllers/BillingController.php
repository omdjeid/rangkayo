<?php

namespace App\Http\Controllers;

use App\Support\CurrentTenant;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $subscription = $tenant->subscription;

        return Inertia::render('Tenancy/Billing/Index', [
            'subscription' => $subscription ? [
                'plan_code' => $subscription->plan_code,
                'plan_name' => $subscription->plan_name,
                'status' => $subscription->status,
                'user_limit' => $subscription->user_limit,
                'branch_limit' => $subscription->branch_limit,
                'transaction_limit' => $subscription->transaction_limit,
                'trial_ends_at' => $subscription->trial_ends_at?->toDateString(),
                'current_period_ends_at' => $subscription->current_period_ends_at?->toDateString(),
            ] : null,
            'usage' => [
                'users' => $tenant->users()->wherePivot('is_active', true)->count(),
                'branches' => $tenant->branches()->count(),
                'transactions' => $tenant->sales()->count(),
            ],
            'plans' => [
                ['code' => 'starter', 'name' => 'Starter', 'price' => 'Manual', 'limits' => '5 user, 1 cabang, 1.000 transaksi'],
                ['code' => 'pro', 'name' => 'Pro', 'price' => 'Manual', 'limits' => '20 user, 5 cabang, 10.000 transaksi'],
            ],
        ]);
    }
}
