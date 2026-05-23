<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\CurrentTenant;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Accounting/AuditLogs/Index', [
            'auditLogs' => AuditLog::query()
                ->with(['branch:id,name', 'user:id,name'])
                ->where('tenant_id', $tenant->id)
                ->latest('occurred_at')
                ->latest('id')
                ->limit(100)
                ->get()
                ->map(fn (AuditLog $auditLog): array => [
                    'id' => $auditLog->id,
                    'action' => $auditLog->action,
                    'description' => $auditLog->description,
                    'branch' => $auditLog->branch?->name,
                    'user' => $auditLog->user?->name,
                    'auditable_type' => $auditLog->auditable_type,
                    'auditable_id' => $auditLog->auditable_id,
                    'metadata' => $auditLog->metadata,
                    'occurred_at' => $auditLog->occurred_at?->toDateTimeString(),
                ])->values(),
        ]);
    }
}
