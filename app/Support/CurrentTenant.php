<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use RuntimeException;

class CurrentTenant
{
    public function context(?User $user = null): TenantUserContext
    {
        $user ??= Auth::user();

        if (! $user instanceof User) {
            throw new RuntimeException('User belum login.');
        }

        $tenantQuery = $user->tenants()
            ->with('subscription')
            ->wherePivot('is_active', true);

        $activeTenantId = Session::get('active_tenant_id');
        $tenant = null;

        if ($activeTenantId !== null) {
            $tenant = (clone $tenantQuery)->whereKey($activeTenantId)->first();
        }

        $tenant ??= $tenantQuery
            ->orderByPivot('is_default', 'desc')
            ->orderBy('tenants.id')
            ->first();

        if (! $tenant instanceof Tenant) {
            throw new RuntimeException('User belum memiliki tenant. Jalankan seeder atau onboarding tenant.');
        }

        $pivot = $tenant->pivot;
        $role = (string) ($pivot?->role ?? 'owner');
        $primaryBranchId = $pivot?->branch_id !== null ? (int) $pivot->branch_id : null;
        $branchIds = BranchAccess::ids($tenant, $user, $role, $primaryBranchId);
        $activeBranchId = Session::get('active_branch_id');
        $branch = null;

        if ($activeBranchId !== null && in_array((int) $activeBranchId, $branchIds, true)) {
            $branch = $tenant->branches()
                ->where('is_active', true)
                ->whereKey($activeBranchId)
                ->first();
        }

        if ($this->roleRequiresBranch($role)) {
            if (! $branch instanceof Branch && $primaryBranchId !== null && in_array($primaryBranchId, $branchIds, true)) {
                $branch = $tenant->branches()
                    ->where('is_active', true)
                    ->whereKey($primaryBranchId)
                    ->first();
            }

            if (! $branch instanceof Branch && $branchIds !== []) {
                $branch = $tenant->branches()
                    ->where('is_active', true)
                    ->whereKey($branchIds[0])
                    ->first();
            }
        }

        return new TenantUserContext(
            user: $user,
            tenant: $tenant,
            role: $role,
            branch: $branch,
            isActive: (bool) ($pivot?->is_active ?? true),
            branchIds: $branchIds,
        );
    }

    /**
     * @return array<int, array{id:int, name:string, slug:string, role:string, is_default:bool, branch:string|null}>
     */
    public function availableWorkspaces(?User $user = null): array
    {
        $user ??= Auth::user();

        if (! $user instanceof User) {
            return [];
        }

        return $user->tenants()
            ->wherePivot('is_active', true)
            ->orderByPivot('is_default', 'desc')
            ->orderBy('tenants.name')
            ->get()
            ->map(fn (Tenant $tenant): array => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'role' => (string) ($tenant->pivot?->role ?? 'owner'),
                'is_default' => (bool) ($tenant->pivot?->is_default ?? false),
                'branch' => $tenant->pivot?->branch_id ? $tenant->branches()->whereKey($tenant->pivot->branch_id)->value('name') : null,
            ])->values()->all();
    }

    public function switchTo(Tenant $tenant, ?User $user = null): void
    {
        $user ??= Auth::user();

        if (! $user instanceof User) {
            throw new RuntimeException('User belum login.');
        }

        $belongs = $user->tenants()
            ->wherePivot('is_active', true)
            ->whereKey($tenant->id)
            ->exists();

        if (! $belongs) {
            throw new RuntimeException('User tidak memiliki akses ke tenant ini.');
        }

        Session::put('active_tenant_id', $tenant->id);
        Session::forget('active_branch_id');
    }

    public function tenant(?User $user = null): Tenant
    {
        return $this->context($user)->tenant;
    }

    public function role(?User $user = null): string
    {
        return $this->context($user)->role;
    }

    private function roleRequiresBranch(string $role): bool
    {
        return in_array($role, ['cashier', 'branch_manager', 'warehouse_staff'], true);
    }

    public function branch(?Tenant $tenant = null, ?User $user = null, ?int $branchId = null): Branch
    {
        $context = $this->context($user);
        $tenant ??= $context->tenant;

        if ($branchId !== null) {
            if (! $context->canAccessBranch($branchId)) {
                throw new RuntimeException('User tidak memiliki akses ke cabang ini.');
            }

            $branch = $tenant->branches()->where('is_active', true)->whereKey($branchId)->first();

            if (! $branch instanceof Branch) {
                throw new RuntimeException('Cabang tidak aktif atau tidak tersedia.');
            }

            return $branch;
        }

        if ($context->tenant->is($tenant) && $context->branch instanceof Branch) {
            return $context->branch;
        }

        $branch = $tenant->branches()->where('is_active', true)->orderBy('id')->first();

        if (! $branch instanceof Branch) {
            throw new RuntimeException('Tenant belum memiliki cabang aktif.');
        }

        return $branch;
    }

    public function warehouse(?Tenant $tenant = null, ?Branch $branch = null, ?int $warehouseId = null): Warehouse
    {
        $tenant ??= $this->tenant();
        $branch ??= $this->branch($tenant);

        $query = $tenant->warehouses()
            ->where('branch_id', $branch->id)
            ->where('is_active', true);

        if ($warehouseId !== null) {
            $warehouse = (clone $query)->whereKey($warehouseId)->first();
        } else {
            $warehouse = $query
                ->orderByDesc('is_default')
                ->orderBy('id')
                ->first();
        }

        if (! $warehouse instanceof Warehouse) {
            throw new RuntimeException('Cabang belum memiliki gudang aktif.');
        }

        return $warehouse;
    }
}
