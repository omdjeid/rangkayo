<?php

namespace Tests\Feature;

use App\Actions\Inventory\RecordStockInAction;
use App\Actions\Sales\CheckoutPosSaleAction;
use App\Models\Accounting\JournalEntry;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Sales\Sale;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoTenantSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MvpFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_in_then_pos_checkout_creates_inventory_and_journal(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $warehouse = $tenant->warehouses()->firstOrFail();
        $product = Product::query()->where('tenant_id', $tenant->id)->firstOrFail();

        app(RecordStockInAction::class)->handle($tenant, $branch, $warehouse, $product, 10, 50000, '1010');
        $this->assertSame(10.0, $product->fresh()->stockOnHand($warehouse->id));

        $sale = app(CheckoutPosSaleAction::class)->handle($tenant, $branch, $warehouse, [
            ['product_id' => $product->id, 'quantity' => 2],
        ]);

        $this->assertInstanceOf(Sale::class, $sale);
        $this->assertSame(8.0, $product->fresh()->stockOnHand($warehouse->id));
        $this->assertSame(2, InventoryMovement::query()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, JournalEntry::query()->where('tenant_id', $tenant->id)->count());
        $this->assertTrue($sale->journalEntry->isBalanced());
    }

    public function test_authenticated_user_can_open_mvp_pages(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();

        $this->actingAs($user);

        $this->get(route('dashboard'))->assertOk();
        $this->get(route('accounts.index'))->assertOk();
        $this->get(route('products.index'))->assertOk();
        $this->get(route('stock-in.index'))->assertOk();
        $this->get(route('journal-entries.index'))->assertOk();
        $this->get(route('pos.index'))->assertOk();
        $this->get(route('reports.stock'))->assertOk();
    }

    public function test_cashier_is_limited_to_pos_and_uses_assigned_branch(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $cashier = User::query()->where('email', 'cashier@akutansia.test')->firstOrFail();
        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $assignedBranchId = $tenant->users()->whereKey($cashier->id)->firstOrFail()->pivot->branch_id;
        $assignedBranch = $tenant->branches()->findOrFail($assignedBranchId);

        $this->actingAs($cashier);

        $this->get(route('dashboard'))
            ->assertRedirect(route('pos.index'));

        $this->get(route('accounts.index'))
            ->assertRedirect(route('pos.index'));

        $this->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('POS/Index')
                ->where('mode', 'cashier')
                ->where('branch.id', $assignedBranch->id)
            );
    }

    public function test_authenticated_user_can_update_product(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $product = Product::query()->where('tenant_id', $tenant->id)->firstOrFail();

        $this->actingAs($user)
            ->patch(route('products.update', $product), [
                'sku' => 'DEMO-EDIT',
                'barcode' => '899000000099',
                'name' => 'Produk Demo Edit',
                'product_category_id' => $product->product_category_id,
                'unit_id' => $product->unit_id,
                'cost_price' => 55000,
                'selling_price' => 90000,
            ])
            ->assertRedirect();

        $product->refresh();

        $this->assertSame('DEMO-EDIT', $product->sku);
        $this->assertSame('Produk Demo Edit', $product->name);
        $this->assertSame('55000.00', $product->cost_price);
        $this->assertSame('90000.00', $product->selling_price);
    }
}
