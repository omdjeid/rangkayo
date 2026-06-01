<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Support\ChatPos\TelegramPosLinkRepository;
use App\Support\CurrentTenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramPosPairingController extends Controller
{
    public function __construct(
        private readonly TelegramPosLinkRepository $links,
    ) {
    }

    public function store(Request $request, CurrentTenant $currentTenant): JsonResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;
        $user = $context->user;

        $payload = $request->validate([
            'store_id' => ['nullable', 'string', 'max:80'],
        ]);

        $store = null;
        if (filled($payload['store_id'] ?? null)) {
            $store = Branch::query()
                ->where('tenant_id', $tenant->id)
                ->where('id', $payload['store_id'])
                ->where('is_active', true)
                ->first(['id', 'name', 'is_active']);

            if ($store instanceof Branch) {
                $store = [
                    'id' => (string) $store->id,
                    'name' => (string) $store->name,
                    'is_active' => (bool) $store->is_active,
                ];
            } else {
                $store = null;
            }

            if (! is_array($store)) {
                return response()->json(['message' => 'Cabang tidak valid untuk tenant ini.'], 422);
            }
        }

        return response()->json($this->links->createPairingCode(
            ['id' => $user->id, 'name' => $user->name, 'branch_id' => $context->branch?->id],
            ['id' => $tenant->id, 'name' => $tenant->name],
            $store,
        ));
    }
}
