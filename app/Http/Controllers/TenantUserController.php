<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TenantUserController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Tenancy/Users/Index', [
            'tenant' => $tenant->only(['id', 'name']),
            'users' => $tenant->users()->orderBy('name')->get()->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->pivot->role,
                'branch_id' => $user->pivot->branch_id,
                'branch' => $user->pivot->branch_id ? Branch::query()->whereKey($user->pivot->branch_id)->value('name') : null,
                'is_active' => (bool) $user->pivot->is_active,
            ])->values(),
            'branches' => $tenant->branches()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'roles' => ['owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse_staff'],
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(['owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse_staff'])],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
        ]);

        $this->ensureUserLimit($tenant);

        $user = User::query()->firstOrCreate(
            ['email' => $validated['email']],
            [
                'name' => $validated['name'],
                'password' => Hash::make($validated['password'] ?? 'password'),
            ],
        );

        if ($user->wasRecentlyCreated === false) {
            $user->update(['name' => $validated['name']]);
        }

        $tenant->users()->syncWithoutDetaching([
            $user->id => [
                'branch_id' => $validated['branch_id'] ?? null,
                'role' => $validated['role'],
                'is_default' => false,
                'is_active' => true,
                'joined_at' => now(),
            ],
        ]);

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update(Request $request, User $user, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        abort_unless($tenant->users()->whereKey($user->id)->exists(), 404);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse_staff'])],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
            'is_active' => ['required', 'boolean'],
        ]);

        $tenant->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'],
        ]);

        return back()->with('success', 'Akses user berhasil diperbarui.');
    }

    private function ensureUserLimit(Tenant $tenant): void
    {
        $subscription = $tenant->subscription;

        if ($subscription && $tenant->users()->wherePivot('is_active', true)->count() >= $subscription->user_limit) {
            abort(422, 'Limit user paket saat ini sudah tercapai.');
        }
    }
}
