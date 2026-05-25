<?php

namespace App\Http\Controllers\Accounting;

use App\Actions\Accounting\CreateFixedAssetAction;
use App\Actions\Accounting\PostFixedAssetDepreciationAction;
use App\Http\Controllers\Controller;
use App\Models\Accounting\Account;
use App\Models\Accounting\FixedAsset;
use App\Support\BranchWarehouseOptions;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FixedAssetController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        return Inertia::render('Accounting/FixedAssets/Index', [
            'branches' => BranchWarehouseOptions::branches($tenant, $context),
            'assets' => FixedAsset::query()
                ->with(['branch:id,name,code', 'depreciations' => fn ($query) => $query->latest('depreciation_date')->limit(3)])
                ->where('tenant_id', $tenant->id)
                ->when($context->isBranchScoped(), fn ($query) => $query->whereIn('branch_id', $context->branchIds))
                ->latest('acquired_at')
                ->get()
                ->map(fn (FixedAsset $asset): array => [
                    'id' => $asset->id,
                    'asset_number' => $asset->asset_number,
                    'name' => $asset->name,
                    'branch' => $asset->branch?->name,
                    'acquired_at' => $asset->acquired_at?->toDateString(),
                    'depreciation_started_at' => $asset->depreciation_started_at?->toDateString(),
                    'acquisition_cost' => (float) $asset->acquisition_cost,
                    'salvage_value' => (float) $asset->salvage_value,
                    'useful_life_months' => $asset->useful_life_months,
                    'monthly_depreciation' => (float) $asset->monthly_depreciation,
                    'accumulated_depreciation' => (float) $asset->accumulated_depreciation,
                    'book_value' => $asset->bookValue(),
                    'last_depreciated_at' => $asset->last_depreciated_at?->toDateString(),
                    'status' => $asset->status,
                    'notes' => $asset->notes,
                ])->values(),
            'accounts' => Account::query()
                ->where('tenant_id', $tenant->id)
                ->whereIn('code', ['1050', '1060', '6050'])
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant, CreateFixedAssetAction $createFixedAsset): RedirectResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $validated = $request->validate([
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
            'name' => ['required', 'string', 'max:255'],
            'acquired_at' => ['required', 'date'],
            'depreciation_started_at' => ['required', 'date'],
            'acquisition_cost' => ['required', 'numeric', 'min:0.01'],
            'salvage_value' => ['nullable', 'numeric', 'min:0'],
            'useful_life_months' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $branch = ! empty($validated['branch_id']) ? $currentTenant->branch($tenant, branchId: (int) $validated['branch_id']) : $context->branch;

        $createFixedAsset->handle(
            tenant: $tenant,
            branch: $branch,
            name: $validated['name'],
            acquiredAt: $validated['acquired_at'],
            depreciationStartedAt: $validated['depreciation_started_at'],
            acquisitionCost: (float) $validated['acquisition_cost'],
            salvageValue: (float) ($validated['salvage_value'] ?? 0),
            usefulLifeMonths: (int) $validated['useful_life_months'],
            notes: $validated['notes'] ?? null,
        );

        return back()->with('success', 'Aset tetap berhasil dicatat dan jurnal perolehan dibuat.');
    }

    public function depreciate(Request $request, FixedAsset $fixedAsset, CurrentTenant $currentTenant, PostFixedAssetDepreciationAction $postDepreciation): RedirectResponse
    {
        $context = $currentTenant->context();
        abort_unless($fixedAsset->tenant_id === $context->tenant->id, 404);
        abort_unless($context->canAccessBranch($fixedAsset->branch_id), 403);

        $validated = $request->validate([
            'depreciation_date' => ['required', 'date'],
        ]);

        $postDepreciation->handle($fixedAsset, $validated['depreciation_date']);

        return back()->with('success', 'Penyusutan aset berhasil diposting.');
    }
}
