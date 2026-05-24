<?php

namespace Tests\Feature;

use App\Actions\Accounting\CreateInvoiceAction;
use App\Actions\Inventory\RecordStockInAction;
use App\Actions\Sales\CheckoutPosSaleAction;
use App\Models\Accounting\Account;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\JournalEntry;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockTransfer;
use App\Models\Sales\Sale;
use App\Models\Tenant;
use App\Models\TenantUserBranch;
use App\Models\User;
use App\Models\Warehouse;
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
        $this->get(route('reports.branch-comparison'))->assertOk();
    }

    public function test_branch_comparison_report_shows_per_branch_metrics(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $owner = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $firstBranch = $tenant->branches()->firstOrFail();
        $firstWarehouse = $tenant->warehouses()->firstOrFail();
        $secondBranch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Bukittinggi',
            'code' => 'BKT',
            'is_active' => true,
        ]);
        $secondWarehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $secondBranch->id,
            'name' => 'Gudang Bukittinggi',
            'code' => 'GD-BKT',
            'is_default' => true,
            'is_active' => true,
        ]);
        $product = Product::query()->where('tenant_id', $tenant->id)->firstOrFail();

        app(RecordStockInAction::class)->handle($tenant, $firstBranch, $firstWarehouse, $product, 10, 50000, '1010');
        $this->travel(1)->seconds();
        app(RecordStockInAction::class)->handle($tenant, $secondBranch, $secondWarehouse, $product, 8, 50000, '1010');
        $this->travel(1)->seconds();
        app(CheckoutPosSaleAction::class)->handle($tenant, $firstBranch, $firstWarehouse, [
            ['product_id' => $product->id, 'quantity' => 2],
        ]);
        $this->travel(1)->seconds();
        app(CheckoutPosSaleAction::class)->handle($tenant, $secondBranch, $secondWarehouse, [
            ['product_id' => $product->id, 'quantity' => 1],
        ]);
        $this->travelBack();

        $this->actingAs($owner)
            ->get(route('reports.branch-comparison'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/BranchComparison/Index')
                ->where('summary.branches', 2)
                ->where('summary.transactions', 2)
                ->has('rows', 2)
            );
    }

    public function test_pos_stock_in_adjustment_and_purchase_use_selected_warehouse(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $firstWarehouse = $tenant->warehouses()->firstOrFail();
        $secondWarehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'name' => 'Gudang Toko Depan',
            'code' => 'GD-FRONT',
            'is_default' => false,
            'is_active' => true,
        ]);
        $product = Product::query()->where('tenant_id', $tenant->id)->firstOrFail();
        $owner = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();

        $this->actingAs($owner)
            ->post(route('stock-in.store'), [
                'warehouse_id' => $secondWarehouse->id,
                'product_id' => $product->id,
                'quantity' => 5,
                'unit_cost' => 50000,
                'payment_account_code' => '1010',
            ])
            ->assertRedirect();

        $this->assertSame(0.0, $product->fresh()->stockOnHand($firstWarehouse->id));
        $this->assertSame(5.0, $product->fresh()->stockOnHand($secondWarehouse->id));

        $this->actingAs($owner)
            ->post(route('stock-adjustments.store'), [
                'warehouse_id' => $secondWarehouse->id,
                'product_id' => $product->id,
                'quantity_delta' => -1,
                'unit_cost' => 50000,
                'reason' => 'Koreksi display',
            ])
            ->assertRedirect();

        $this->assertSame(4.0, $product->fresh()->stockOnHand($secondWarehouse->id));

        $this->actingAs($owner)
            ->post(route('pos.checkout'), [
                'warehouse_id' => $secondWarehouse->id,
                'payment_method' => 'cash',
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(2.0, $product->fresh()->stockOnHand($secondWarehouse->id));

        $purchaseAccount = Account::query()->where('tenant_id', $tenant->id)->where('code', '5010')->firstOrFail();
        $invoice = app(CreateInvoiceAction::class)->handle(
            tenant: $tenant,
            branch: $branch,
            contact: null,
            type: 'purchase',
            date: today()->toDateString(),
            dueDate: null,
            items: [[
                'account_id' => $purchaseAccount->id,
                'product_id' => $product->id,
                'warehouse_id' => $secondWarehouse->id,
                'description' => 'Pembelian display',
                'quantity' => 3,
                'unit_price' => 50000,
            ]],
        );

        $this->assertInstanceOf(Invoice::class, $invoice);
        $this->assertSame(5.0, $product->fresh()->stockOnHand($secondWarehouse->id));
    }

    public function test_stock_transfer_requires_approval_and_receive(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $owner = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $fromWarehouse = $tenant->warehouses()->firstOrFail();
        $toWarehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'name' => 'Gudang Transit',
            'code' => 'GD-TRN',
            'is_default' => false,
            'is_active' => true,
        ]);
        $product = Product::query()->where('tenant_id', $tenant->id)->firstOrFail();

        app(RecordStockInAction::class)->handle($tenant, $branch, $fromWarehouse, $product, 10, 50000, '1010');

        $this->actingAs($owner)
            ->post(route('stock-transfers.store'), [
                'from_warehouse_id' => $fromWarehouse->id,
                'to_warehouse_id' => $toWarehouse->id,
                'product_id' => $product->id,
                'quantity' => 4,
                'unit_cost' => 50000,
                'notes' => 'Restock toko',
            ])
            ->assertRedirect();

        $transfer = StockTransfer::query()->where('tenant_id', $tenant->id)->firstOrFail();

        $this->assertSame('draft', $transfer->status);
        $this->assertSame(10.0, $product->fresh()->stockOnHand($fromWarehouse->id));
        $this->assertSame(0.0, $product->fresh()->stockOnHand($toWarehouse->id));

        $this->actingAs($owner)
            ->patch(route('stock-transfers.approve', $transfer))
            ->assertRedirect();

        $transfer->refresh();

        $this->assertSame('approved', $transfer->status);
        $this->assertSame(6.0, $product->fresh()->stockOnHand($fromWarehouse->id));
        $this->assertSame(0.0, $product->fresh()->stockOnHand($toWarehouse->id));

        $this->actingAs($owner)
            ->patch(route('stock-transfers.receive', $transfer))
            ->assertRedirect();

        $transfer->refresh();

        $this->assertSame('received', $transfer->status);
        $this->assertSame(6.0, $product->fresh()->stockOnHand($fromWarehouse->id));
        $this->assertSame(4.0, $product->fresh()->stockOnHand($toWarehouse->id));
    }

    public function test_owner_can_assign_multi_branch_access_to_user(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $owner = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $cashier = User::query()->where('email', 'cashier@akutansia.test')->firstOrFail();
        $firstBranch = $tenant->branches()->firstOrFail();
        $secondBranch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Lima Puluh Kota',
            'code' => 'LPK',
            'is_active' => true,
        ]);
        Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $secondBranch->id,
            'name' => 'Gudang Lima Puluh Kota',
            'code' => 'GD-LPK',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->actingAs($owner)
            ->patch(route('tenant-users.update', $cashier), [
                'role' => 'branch_manager',
                'branch_id' => $firstBranch->id,
                'branch_ids' => [$firstBranch->id, $secondBranch->id],
                'is_active' => true,
            ])
            ->assertRedirect();

        $pivot = $tenant->users()->whereKey($cashier->id)->firstOrFail()->pivot;

        $this->assertSame('branch_manager', $pivot->role);
        $this->assertSame($firstBranch->id, $pivot->branch_id);
        $this->assertEqualsCanonicalizing(
            [$firstBranch->id, $secondBranch->id],
            TenantUserBranch::query()
                ->where('tenant_id', $tenant->id)
                ->where('user_id', $cashier->id)
                ->pluck('branch_id')
                ->map(fn ($id): int => (int) $id)
                ->all(),
        );

        $this->actingAs($cashier)
            ->post(route('branch.switch'), ['branch_id' => $secondBranch->id])
            ->assertForbidden();

        $this->actingAs($cashier)
            ->get(route('stock-in.index', ['warehouse_id' => $secondBranch->warehouses()->firstOrFail()->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inventory/StockIn/Index')
                ->where('warehouse.id', $secondBranch->warehouses()->firstOrFail()->id)
            );
    }

    public function test_owner_can_switch_active_branch_context(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $secondBranch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Bukittinggi',
            'code' => 'BKT',
            'is_active' => true,
        ]);
        Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $secondBranch->id,
            'name' => 'Gudang Bukittinggi',
            'code' => 'GD-BKT',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('branch', null)
                ->where('auth.workspace.branch', null)
            );

        $this->actingAs($user)
            ->post(route('branch.switch'), ['branch_id' => $secondBranch->id])
            ->assertRedirect();

        $this->assertSame($secondBranch->id, session('active_branch_id'));

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('branch.id', $secondBranch->id)
                ->where('auth.workspace.branch.id', $secondBranch->id)
            );

        $this->actingAs($user)
            ->post(route('branch.switch'), ['branch_id' => ''])
            ->assertRedirect();

        $this->assertNull(session('active_branch_id'));
    }

    public function test_cashier_cannot_switch_branch_context(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $cashier = User::query()->where('email', 'cashier@akutansia.test')->firstOrFail();
        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();

        $this->actingAs($cashier)
            ->post(route('branch.switch'), ['branch_id' => $branch->id])
            ->assertForbidden();
    }

    public function test_owner_can_update_branch_and_warehouse(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $warehouse = $tenant->warehouses()->firstOrFail();

        $this->actingAs($user)
            ->patch(route('branches.update', $branch), [
                'name' => 'Cabang Payakumbuh Utama',
                'code' => 'PYK-UTM',
                'phone' => '075212345',
                'address' => 'Pusat Kota Payakumbuh',
            ])
            ->assertRedirect();

        $this->actingAs($user)
            ->patch(route('warehouses.update', $warehouse), [
                'branch_id' => $branch->id,
                'name' => 'Gudang Utama Payakumbuh',
                'code' => 'GD-UTM',
                'is_default' => true,
            ])
            ->assertRedirect();

        $this->assertSame('Cabang Payakumbuh Utama', $branch->fresh()->name);
        $this->assertSame('PYK-UTM', $branch->fresh()->code);
        $this->assertSame('Gudang Utama Payakumbuh', $warehouse->fresh()->name);
        $this->assertTrue($warehouse->fresh()->is_default);
    }

    public function test_owner_can_disable_non_default_warehouse_and_non_last_branch(): void
    {
        $this->seed(DemoTenantSeeder::class);

        $tenant = Tenant::query()->where('slug', 'demo-payakumbuh')->firstOrFail();
        $user = User::query()->where('email', 'owner@akutansia.test')->firstOrFail();
        $branch = $tenant->branches()->firstOrFail();
        $secondBranch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Bukittinggi',
            'code' => 'BKT',
            'is_active' => true,
        ]);
        $secondWarehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'name' => 'Gudang Cadangan',
            'code' => 'GD-CDG',
            'is_default' => false,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patch(route('warehouses.status', $secondWarehouse), ['is_active' => false])
            ->assertRedirect();

        $this->actingAs($user)
            ->patch(route('branches.status', $secondBranch), ['is_active' => false])
            ->assertRedirect();

        $this->assertFalse($secondWarehouse->fresh()->is_active);
        $this->assertFalse($secondBranch->fresh()->is_active);
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
