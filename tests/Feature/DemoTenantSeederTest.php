<?php

namespace Tests\Feature;

use App\Models\Accounting\Account;
use App\Models\Inventory\Product;
use App\Models\Tenant;
use App\Support\DefaultChartOfAccounts;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoTenantSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_tenant_seeder_creates_onboarding_data(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();

        $this->assertSame('Demo Retail Payakumbuh', $tenant->name);
        $this->assertTrue($tenant->branches()->where('code', 'PYK')->exists());
        $this->assertTrue($tenant->warehouses()->where('code', 'GD-PYK')->exists());
        $this->assertTrue($tenant->users()->where('email', 'owner@akutansia.test')->exists());
        $this->assertSame(count(DefaultChartOfAccounts::accounts()), Account::query()->where('tenant_id', $tenant->id)->count());
        $this->assertTrue(Product::query()->where('tenant_id', $tenant->id)->where('sku', 'DEMO-001')->exists());
    }
}
