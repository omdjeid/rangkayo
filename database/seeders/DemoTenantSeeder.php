<?php

namespace Database\Seeders;

use App\Models\Accounting\Account;
use App\Models\Accounting\TaxRate;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductCategory;
use App\Models\Inventory\Unit;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\DefaultChartOfAccounts;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoTenantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'owner@akutansia.test'],
            [
                'name' => 'Owner Akutansia',
                'password' => Hash::make('password'),
            ],
        );

        $cashier = User::query()->firstOrCreate(
            ['email' => 'cashier@akutansia.test'],
            [
                'name' => 'Kasir Payakumbuh',
                'password' => Hash::make('password'),
            ],
        );

        $tenant = Tenant::query()->firstOrCreate(
            ['slug' => 'demo-payakumbuh'],
            [
                'name' => 'Demo Retail Payakumbuh',
                'business_type' => 'retail',
                'currency_code' => 'IDR',
                'timezone' => 'Asia/Jakarta',
            ],
        );

        $branch = Branch::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'PYK'],
            [
                'name' => 'Cabang Payakumbuh',
                'address' => 'Payakumbuh, Sumatera Barat',
            ],
        );

        $warehouse = Warehouse::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'GD-PYK'],
            [
                'branch_id' => $branch->id,
                'name' => 'Gudang Payakumbuh',
                'is_default' => true,
            ],
        );

        $tenant->users()->syncWithoutDetaching([
            $user->id => [
                'branch_id' => $branch->id,
                'role' => 'owner',
                'is_default' => true,
                'is_active' => true,
                'joined_at' => now(),
            ],
            $cashier->id => [
                'branch_id' => $branch->id,
                'role' => 'cashier',
                'is_default' => true,
                'is_active' => true,
                'joined_at' => now(),
            ],
        ]);

        TenantSubscription::query()->firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'plan_code' => 'starter',
                'plan_name' => 'Starter',
                'status' => 'trial',
                'user_limit' => 10,
                'branch_limit' => 3,
                'transaction_limit' => 5000,
                'trial_ends_at' => now()->addDays(14),
                'current_period_ends_at' => now()->addMonth(),
            ],
        );

        foreach (DefaultChartOfAccounts::accounts() as $account) {
            Account::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'code' => $account['code']],
                [
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'normal_balance' => $account['normal_balance'],
                    'is_cash' => $account['is_cash'] ?? false,
                    'is_system' => $account['is_system'] ?? false,
                ],
            );
        }

        TaxRate::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'PPN11'],
            [
                'account_id' => Account::query()->where('tenant_id', $tenant->id)->where('code', '2020')->value('id'),
                'input_account_id' => Account::query()->where('tenant_id', $tenant->id)->where('code', '1070')->value('id'),
                'name' => 'PPN 11%',
                'rate' => 11,
                'is_default' => true,
                'is_active' => true,
            ],
        );

        $unit = Unit::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'symbol' => 'pcs'],
            ['name' => 'Pieces'],
        );

        $category = ProductCategory::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'produk-retail'],
            ['name' => 'Produk Retail'],
        );

        Product::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'sku' => 'DEMO-001'],
            [
                'product_category_id' => $category->id,
                'unit_id' => $unit->id,
                'barcode' => '899000000001',
                'name' => 'Produk Demo',
                'cost_price' => 50000,
                'selling_price' => 80000,
                'wholesale_price' => 65000,
            ],
        );

        Contact::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'type' => 'customer', 'name' => 'Customer Umum'],
            ['phone' => '080000000000'],
        );

        Contact::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'type' => 'customer', 'name' => 'Customer Grosir'],
            ['phone' => '080000000001', 'price_level' => 'grosir'],
        );

        Contact::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'type' => 'supplier', 'name' => 'Supplier Demo'],
            ['phone' => '081111111111'],
        );

        $this->command?->info("Demo tenant siap: {$tenant->name}, cabang {$branch->name}, gudang {$warehouse->name}.");
        $this->command?->info('Login demo owner: owner@akutansia.test / password');
        $this->command?->info('Login demo kasir: cashier@akutansia.test / password');
    }
}
