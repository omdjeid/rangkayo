<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Warehouse;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BranchWarehouseController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();

        return Inertia::render('Tenancy/Branches/Index', [
            'branches' => $tenant->branches()->with('warehouses')->orderBy('name')->get()->map(fn (Branch $branch): array => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'phone' => $branch->phone,
                'address' => $branch->address,
                'is_active' => $branch->is_active,
                'warehouses' => $branch->warehouses->map(fn (Warehouse $warehouse): array => [
                    'id' => $warehouse->id,
                    'name' => $warehouse->name,
                    'code' => $warehouse->code,
                    'is_default' => $warehouse->is_default,
                    'is_active' => $warehouse->is_active,
                ])->values(),
            ])->values(),
        ]);
    }

    public function storeBranch(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $subscription = $tenant->subscription;

        if ($subscription && $tenant->branches()->count() >= $subscription->branch_limit) {
            abort(422, 'Limit cabang paket saat ini sudah tercapai.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32', Rule::unique('branches')->where('tenant_id', $tenant->id)],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant->branches()->create([...$validated, 'is_active' => true]);

        return back()->with('success', 'Cabang berhasil dibuat.');
    }

    public function storeWarehouse(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'branch_id' => ['required', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32', Rule::unique('warehouses')->where('tenant_id', $tenant->id)],
            'is_default' => ['boolean'],
        ]);

        if ($validated['is_default'] ?? false) {
            Warehouse::query()->where('tenant_id', $tenant->id)->where('branch_id', $validated['branch_id'])->update(['is_default' => false]);
        }

        Warehouse::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'is_active' => true,
        ]);

        return back()->with('success', 'Gudang berhasil dibuat.');
    }
}
