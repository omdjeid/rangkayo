<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\Request;
use Inertia\Middleware;
use RuntimeException;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $workspace = null;
        $workspaces = [];
        $branches = [];

        if ($user instanceof User) {
            try {
                $currentTenant = app(CurrentTenant::class);
                $context = $currentTenant->context($user);
                $workspace = $context->toSharedArray();
                $workspaces = $currentTenant->availableWorkspaces($user);
                $branches = $context->tenant->branches()
                    ->where('is_active', true)
                    ->when($context->isBranchScoped(), fn ($query) => $query->whereIn('id', $context->branchIds))
                    ->orderBy('name')
                    ->get(['id', 'name', 'code'])
                    ->map(fn ($branch): array => [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'code' => $branch->code,
                    ])
                    ->values();
            } catch (RuntimeException) {
                $workspace = null;
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'workspace' => $workspace,
                'workspaces' => $workspaces,
                'branches' => $branches,
            ],
        ];
    }
}
