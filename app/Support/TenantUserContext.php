<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;

class TenantUserContext
{
    public function __construct(
        public readonly User $user,
        public readonly Tenant $tenant,
        public readonly string $role,
        public readonly ?Branch $branch = null,
        public readonly bool $isActive = true,
    ) {}

    /**
     * @param  array<int, string>  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isCashierOnly(): bool
    {
        return $this->role === 'cashier';
    }

    public function isBranchScoped(): bool
    {
        return in_array($this->role, ['cashier', 'branch_manager', 'warehouse_staff'], true);
    }

    public function branchId(): ?int
    {
        return $this->branch?->id;
    }

    /**
     * @return array{id:int, name:string, slug:string, role:string, is_active:bool, branch:array{id:int, name:string, code:string|null}|null, subscription:array{plan_code:string, plan_name:string, status:string}|null}
     */
    public function toSharedArray(): array
    {
        return [
            'id' => $this->tenant->id,
            'name' => $this->tenant->name,
            'slug' => $this->tenant->slug,
            'role' => $this->role,
            'is_active' => $this->isActive,
            'branch' => $this->branch instanceof Branch ? [
                'id' => $this->branch->id,
                'name' => $this->branch->name,
                'code' => $this->branch->code,
            ] : null,
            'subscription' => $this->tenant->subscription ? [
                'plan_code' => $this->tenant->subscription->plan_code,
                'plan_name' => $this->tenant->subscription->plan_name,
                'status' => $this->tenant->subscription->status,
            ] : null,
        ];
    }
}
