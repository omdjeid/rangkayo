<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\PlatformAuditLog;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminController extends Controller
{
    public function index(): Response
    {
        $tenants = Tenant::query()
            ->withCount([
                'users',
                'branches',
                'warehouses',
                'products',
                'contacts',
                'invoices',
                'journalEntries',
                'sales',
            ])
            ->withSum('sales', 'grand_total')
            ->withSum('invoices', 'grand_total')
            ->with(['subscription', 'users' => fn ($query) => $query->wherePivot('role', 'owner')->limit(1)])
            ->orderBy('name')
            ->get();

        return Inertia::render('Platform/SuperAdmin/Index', [
            'summary' => [
                'tenants' => $tenants->count(),
                'active_tenants' => $tenants->where('status', 'active')->count(),
                'suspended_tenants' => $tenants->where('status', 'suspended')->count(),
                'trial_tenants' => $tenants->filter(fn (Tenant $tenant): bool => $tenant->subscription?->status === 'trial')->count(),
                'total_users' => $tenants->sum('users_count'),
                'total_branches' => $tenants->sum('branches_count'),
                'total_sales' => $tenants->sum('sales_count'),
                'gross_sales' => (float) $tenants->sum('sales_sum_grand_total'),
            ],
            'tenants' => $tenants
                ->map(fn (Tenant $tenant): array => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'legal_name' => $tenant->legal_name,
                    'business_type' => $tenant->business_type,
                    'currency_code' => $tenant->currency_code,
                    'timezone' => $tenant->timezone,
                    'status' => $tenant->status,
                    'created_at' => $tenant->created_at?->toDateString(),
                    'owner' => $tenant->users->first() ? [
                        'name' => $tenant->users->first()->name,
                        'email' => $tenant->users->first()->email,
                    ] : null,
                    'users_count' => $tenant->users_count,
                    'branches_count' => $tenant->branches_count,
                    'warehouses_count' => $tenant->warehouses_count,
                    'products_count' => $tenant->products_count,
                    'contacts_count' => $tenant->contacts_count,
                    'invoices_count' => $tenant->invoices_count,
                    'journal_entries_count' => $tenant->journal_entries_count,
                    'sales_count' => $tenant->sales_count,
                    'gross_sales' => (float) ($tenant->sales_sum_grand_total ?? 0),
                    'invoice_total' => (float) ($tenant->invoices_sum_grand_total ?? 0),
                    'subscription' => $tenant->subscription ? [
                        'plan_name' => $tenant->subscription->plan_name,
                        'status' => $tenant->subscription->status,
                        'user_limit' => $tenant->subscription->user_limit,
                        'branch_limit' => $tenant->subscription->branch_limit,
                        'transaction_limit' => $tenant->subscription->transaction_limit,
                        'trial_ends_at' => $tenant->subscription->trial_ends_at?->toDateString(),
                        'current_period_ends_at' => $tenant->subscription->current_period_ends_at?->toDateString(),
                    ] : null,
                ])->values(),
        ]);
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'plan_name' => ['required', 'string', 'max:64'],
            'subscription_status' => ['required', 'in:trial,active,expired,suspended'],
            'user_limit' => ['required', 'integer', 'min:1'],
            'branch_limit' => ['required', 'integer', 'min:1'],
            'transaction_limit' => ['required', 'integer', 'min:1'],
        ]);

        $tenant->update(['status' => $validated['status']]);
        TenantSubscription::updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'plan_code' => str($validated['plan_name'])->slug()->toString(),
                'plan_name' => $validated['plan_name'],
                'status' => $validated['subscription_status'],
                'user_limit' => $validated['user_limit'],
                'branch_limit' => $validated['branch_limit'],
                'transaction_limit' => $validated['transaction_limit'],
                'current_period_ends_at' => now()->addMonth(),
            ],
        );

        PlatformAuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'tenant_id' => $tenant->id,
            'action' => 'tenant.subscription.updated',
            'description' => "Subscription {$tenant->name} diperbarui.",
            'metadata' => $validated,
        ]);

        return back()->with('success', 'Tenant berhasil diperbarui.');
    }
}
