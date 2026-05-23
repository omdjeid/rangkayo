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

        if ($user instanceof User) {
            try {
                $currentTenant = app(CurrentTenant::class);
                $workspace = $currentTenant->context($user)->toSharedArray();
                $workspaces = $currentTenant->availableWorkspaces($user);
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
            ],
        ];
    }
}
