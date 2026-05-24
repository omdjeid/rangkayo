<?php

namespace App\Support;

use App\Models\Tenant;
use App\Models\TenantUserBranch;
use App\Models\User;

class BranchAccess
{
    /**
     * @return array<int, int>
     */
    public static function ids(Tenant $tenant, User $user, string $role, ?int $primaryBranchId = null): array
    {
        if (in_array($role, ['owner', 'admin', 'accountant'], true)) {
            return $tenant->branches()
                ->where('is_active', true)
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
        }

        $ids = TenantUserBranch::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->pluck('branch_id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        if ($primaryBranchId !== null) {
            $ids[] = $primaryBranchId;
        }

        return array_values(array_unique(array_filter($ids)));
    }
}
