<?php

namespace App\Support;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class TenantNotificationRecipients
{
    /**
     * @return Collection<int, User>
     */
    public static function billingRecipients(Tenant $tenant): Collection
    {
        /** @var Collection<int, User> $users */
        $users = $tenant->users()
            ->wherePivot('is_active', true)
            ->wherePivotIn('role', ['owner', 'admin'])
            ->orderBy('users.id')
            ->get();

        if ($users->isNotEmpty()) {
            return $users;
        }

        /** @var Collection<int, User> $fallback */
        $fallback = $tenant->users()
            ->wherePivot('is_active', true)
            ->orderBy('users.id')
            ->limit(1)
            ->get();

        return $fallback;
    }
}
