<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\TenantUserBranch;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
                'branch_ids' => $this->userBranchIds($tenant, $user),
                'branch' => $user->pivot->branch_id ? Branch::query()->whereKey($user->pivot->branch_id)->value('name') : null,
                'branches' => $this->userBranchNames($tenant, $user),
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
            'branch_ids' => ['nullable', 'array'],
            'branch_ids.*' => [Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
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

        $branchIds = $this->normalizeBranchIds($validated['branch_ids'] ?? [], $validated['branch_id'] ?? null);
        $this->ensureRoleHasBranches($validated['role'], $branchIds);
        $primaryBranchId = $this->primaryBranchId($validated['role'], $branchIds);

        $tenant->users()->syncWithoutDetaching([
            $user->id => [
                'branch_id' => $primaryBranchId,
                'role' => $validated['role'],
                'is_default' => false,
                'is_active' => true,
                'joined_at' => now(),
            ],
        ]);

        $this->syncBranches($tenant, $user, $branchIds);

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update(Request $request, User $user, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        abort_unless($tenant->users()->whereKey($user->id)->exists(), 404);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['owner', 'admin', 'accountant', 'branch_manager', 'cashier', 'warehouse_staff'])],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
            'branch_ids' => ['nullable', 'array'],
            'branch_ids.*' => [Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
            'is_active' => ['required', 'boolean'],
        ]);

        $branchIds = $this->normalizeBranchIds($validated['branch_ids'] ?? [], $validated['branch_id'] ?? null);
        $this->ensureRoleHasBranches($validated['role'], $branchIds);
        $primaryBranchId = $this->primaryBranchId($validated['role'], $branchIds);

        $tenant->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
            'branch_id' => $primaryBranchId,
            'is_active' => $validated['is_active'],
        ]);

        $this->syncBranches($tenant, $user, $branchIds);

        return back()->with('success', 'Akses user berhasil diperbarui.');
    }

    /**
     * @param  array<int, mixed>  $branchIds
     * @return array<int, int>
     */
    private function normalizeBranchIds(array $branchIds, mixed $primaryBranchId = null): array
    {
        if ($primaryBranchId !== null && $primaryBranchId !== '') {
            $branchIds[] = $primaryBranchId;
        }

        return collect($branchIds)
            ->filter(fn (mixed $id): bool => $id !== null && $id !== '')
            ->map(fn (mixed $id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int>  $branchIds
     */
    private function ensureRoleHasBranches(string $role, array $branchIds): void
    {
        if (! in_array($role, ['cashier', 'branch_manager', 'warehouse_staff'], true) || $branchIds !== []) {
            return;
        }

        throw ValidationException::withMessages([
            'branch_ids' => 'Pilih minimal satu cabang untuk role cabang/gudang/kasir.',
        ]);
    }

    /**
     * @param  array<int, int>  $branchIds
     */
    private function primaryBranchId(string $role, array $branchIds): ?int
    {
        if (in_array($role, ['owner', 'admin', 'accountant'], true)) {
            return null;
        }

        return $branchIds[0] ?? null;
    }

    /**
     * @param  array<int, int>  $branchIds
     */
    private function syncBranches(Tenant $tenant, User $user, array $branchIds): void
    {
        TenantUserBranch::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->whereNotIn('branch_id', $branchIds ?: [0])
            ->delete();

        foreach ($branchIds as $branchId) {
            TenantUserBranch::query()->firstOrCreate([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'branch_id' => $branchId,
            ]);
        }
    }

    /**
     * @return array<int, int>
     */
    private function userBranchIds(Tenant $tenant, User $user): array
    {
        $pivotBranchId = $user->pivot?->branch_id !== null ? [(int) $user->pivot->branch_id] : [];
        $explicitBranchIds = TenantUserBranch::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->pluck('branch_id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return array_values(array_unique([...$pivotBranchId, ...$explicitBranchIds]));
    }

    /**
     * @return array<int, string>
     */
    private function userBranchNames(Tenant $tenant, User $user): array
    {
        $branchIds = $this->userBranchIds($tenant, $user);

        if ($branchIds === []) {
            return [];
        }

        return Branch::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('id', $branchIds)
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name): string => (string) $name)
            ->all();
    }

    private function ensureUserLimit(Tenant $tenant): void
    {
        $subscription = $tenant->subscription;

        if ($subscription && $tenant->users()->wherePivot('is_active', true)->count() >= $subscription->user_limit) {
            abort(422, 'Limit user paket saat ini sudah tercapai.');
        }
    }
}
