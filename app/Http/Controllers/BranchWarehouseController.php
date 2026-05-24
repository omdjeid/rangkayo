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

        $validated = $request->validate($this->branchRules($tenant->id));

        $tenant->branches()->create([...$validated, 'is_active' => true]);

        return back()->with('success', 'Cabang berhasil dibuat.');
    }

    public function updateBranch(Request $request, CurrentTenant $currentTenant, Branch $branch): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $this->ensureBranchTenant($branch, $tenant->id);

        $validated = $request->validate($this->branchRules($tenant->id, $branch->id));
        $branch->update($validated);

        return back()->with('success', 'Cabang berhasil diperbarui.');
    }

    public function toggleBranch(Request $request, CurrentTenant $currentTenant, Branch $branch): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $this->ensureBranchTenant($branch, $tenant->id);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        if (! $validated['is_active'] && $tenant->branches()->where('is_active', true)->whereKeyNot($branch->id)->doesntExist()) {
            abort(422, 'Minimal harus ada satu cabang aktif.');
        }

        $branch->update(['is_active' => $validated['is_active']]);

        if (! $validated['is_active']) {
            $branch->warehouses()->update(['is_active' => false, 'is_default' => false]);
        }

        return back()->with('success', $validated['is_active'] ? 'Cabang berhasil diaktifkan.' : 'Cabang berhasil dinonaktifkan.');
    }

    public function storeWarehouse(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate($this->warehouseRules($tenant->id));
        $branch = Branch::query()->where('tenant_id', $tenant->id)->whereKey($validated['branch_id'])->firstOrFail();

        if ($validated['is_default'] ?? false) {
            $this->clearDefaultWarehouses($tenant->id, $branch->id);
        }

        Warehouse::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'is_active' => true,
        ]);

        return back()->with('success', 'Gudang berhasil dibuat.');
    }

    public function updateWarehouse(Request $request, CurrentTenant $currentTenant, Warehouse $warehouse): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $this->ensureWarehouseTenant($warehouse, $tenant->id);

        $validated = $request->validate($this->warehouseRules($tenant->id, $warehouse->id));
        $branch = Branch::query()->where('tenant_id', $tenant->id)->whereKey($validated['branch_id'])->firstOrFail();

        if ($validated['is_default'] ?? false) {
            $this->clearDefaultWarehouses($tenant->id, $branch->id, $warehouse->id);
        }

        $warehouse->update($validated);

        return back()->with('success', 'Gudang berhasil diperbarui.');
    }

    public function toggleWarehouse(Request $request, CurrentTenant $currentTenant, Warehouse $warehouse): RedirectResponse
    {
        $tenant = $currentTenant->tenant();
        $this->ensureWarehouseTenant($warehouse, $tenant->id);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        if ($validated['is_active']) {
            $branchIsActive = Branch::query()
                ->where('tenant_id', $tenant->id)
                ->whereKey($warehouse->branch_id)
                ->where('is_active', true)
                ->exists();

            if (! $branchIsActive) {
                abort(422, 'Aktifkan cabang terlebih dahulu sebelum mengaktifkan gudang.');
            }
        }

        if (! $validated['is_active'] && $warehouse->is_default) {
            abort(422, 'Gudang default tidak bisa dinonaktifkan. Pilih gudang default lain terlebih dahulu.');
        }

        if (! $validated['is_active'] && Warehouse::query()->where('tenant_id', $tenant->id)->where('branch_id', $warehouse->branch_id)->where('is_active', true)->whereKeyNot($warehouse->id)->doesntExist()) {
            abort(422, 'Minimal harus ada satu gudang aktif pada cabang ini.');
        }

        $warehouse->update(['is_active' => $validated['is_active']]);

        return back()->with('success', $validated['is_active'] ? 'Gudang berhasil diaktifkan.' : 'Gudang berhasil dinonaktifkan.');
    }

    /**
     * @return array<string, mixed>
     */
    private function branchRules(int $tenantId, ?int $ignoreBranchId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32', Rule::unique('branches')->where('tenant_id', $tenantId)->ignore($ignoreBranchId)],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function warehouseRules(int $tenantId, ?int $ignoreWarehouseId = null): array
    {
        return [
            'branch_id' => ['required', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32', Rule::unique('warehouses')->where('tenant_id', $tenantId)->ignore($ignoreWarehouseId)],
            'is_default' => ['boolean'],
        ];
    }

    private function ensureBranchTenant(Branch $branch, int $tenantId): void
    {
        abort_unless($branch->tenant_id === $tenantId, 404);
    }

    private function ensureWarehouseTenant(Warehouse $warehouse, int $tenantId): void
    {
        abort_unless($warehouse->tenant_id === $tenantId, 404);
    }

    private function clearDefaultWarehouses(int $tenantId, int $branchId, ?int $exceptWarehouseId = null): void
    {
        Warehouse::query()
            ->where('tenant_id', $tenantId)
            ->where('branch_id', $branchId)
            ->when($exceptWarehouseId !== null, fn ($query) => $query->whereKeyNot($exceptWarehouseId))
            ->update(['is_default' => false]);
    }
}
