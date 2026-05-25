<?php

namespace App\Actions\Tenancy;

use App\Models\Accounting\Account;
use App\Models\Accounting\TaxRate;
use App\Models\Branch;
use App\Models\Inventory\ProductCategory;
use App\Models\Inventory\Unit;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\DefaultChartOfAccounts;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateTenantOnboardingAction
{
    public function handle(User $owner, string $businessName, ?string $slug = null, ?string $businessType = null, string $branchName = 'Cabang Utama', string $warehouseName = 'Gudang Utama'): Tenant
    {
        return DB::transaction(function () use ($owner, $businessName, $slug, $businessType, $branchName, $warehouseName): Tenant {
            $baseSlug = Str::slug($slug ?: $businessName);
            $slug = $baseSlug;
            $counter = 2;

            while (Tenant::query()->where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$counter++;
            }

            /** @var Tenant $tenant */
            $tenant = Tenant::query()->create([
                'name' => $businessName,
                'slug' => $slug,
                'business_type' => $businessType,
                'currency_code' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'status' => 'active',
                'receipt_prefix' => 'POS',
                'invoice_prefix' => 'INV',
            ]);

            $branch = Branch::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $branchName,
                'code' => 'MAIN',
                'is_active' => true,
            ]);

            Warehouse::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'name' => $warehouseName,
                'code' => 'GD-MAIN',
                'is_default' => true,
                'is_active' => true,
            ]);

            $tenant->users()->syncWithoutDetaching([
                $owner->id => [
                    'branch_id' => $branch->id,
                    'role' => 'owner',
                    'is_default' => true,
                    'is_active' => true,
                    'joined_at' => now(),
                ],
            ]);

            TenantSubscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_code' => 'starter',
                'plan_name' => 'Starter',
                'status' => 'trial',
                'user_limit' => 5,
                'branch_limit' => 1,
                'transaction_limit' => 1000,
                'trial_ends_at' => now()->addDays(14),
                'current_period_ends_at' => now()->addMonth(),
            ]);

            foreach (DefaultChartOfAccounts::accounts() as $account) {
                Account::query()->create([
                    'tenant_id' => $tenant->id,
                    'code' => $account['code'],
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'normal_balance' => $account['normal_balance'],
                    'is_cash' => $account['is_cash'] ?? false,
                    'is_system' => $account['is_system'] ?? false,
                ]);
            }

            TaxRate::query()->create([
                'tenant_id' => $tenant->id,
                'account_id' => Account::query()->where('tenant_id', $tenant->id)->where('code', '2020')->value('id'),
                'input_account_id' => Account::query()->where('tenant_id', $tenant->id)->where('code', '1070')->value('id'),
                'name' => 'PPN 11%',
                'code' => 'PPN11',
                'rate' => 11,
                'is_default' => true,
                'is_active' => true,
            ]);

            Unit::query()->create([
                'tenant_id' => $tenant->id,
                'name' => 'Pieces',
                'symbol' => 'pcs',
            ]);

            ProductCategory::query()->create([
                'tenant_id' => $tenant->id,
                'name' => 'Produk Retail',
                'slug' => 'produk-retail',
            ]);

            return $tenant;
        });
    }
}
