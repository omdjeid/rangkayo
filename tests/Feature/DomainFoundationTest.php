<?php

namespace Tests\Feature;

use App\Actions\Accounting\PostJournalEntryAction;
use App\Models\Accounting\Account;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Inventory\Unit;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class DomainFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_own_branches_warehouses_and_users(): void
    {
        $user = User::factory()->create();
        $tenant = Tenant::query()->create([
            'name' => 'Toko Payakumbuh',
            'slug' => 'toko-payakumbuh',
        ]);
        $branch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Pusat',
            'code' => 'PST',
        ]);
        $warehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'name' => 'Gudang Pusat',
            'code' => 'GDP',
            'is_default' => true,
        ]);

        $tenant->users()->attach($user->id, [
            'branch_id' => $branch->id,
            'role' => 'owner',
            'is_default' => true,
            'joined_at' => now(),
        ]);

        $this->assertTrue($tenant->branches()->whereKey($branch)->exists());
        $this->assertTrue($tenant->warehouses()->whereKey($warehouse)->exists());
        $this->assertTrue($tenant->users()->whereKey($user)->exists());
    }

    public function test_post_journal_entry_action_requires_balanced_lines(): void
    {
        $tenant = Tenant::query()->create([
            'name' => 'Kedai Contoh',
            'slug' => 'kedai-contoh',
        ]);

        $cash = Account::query()->create([
            'tenant_id' => $tenant->id,
            'code' => '1010',
            'name' => 'Kas',
            'type' => 'asset',
            'normal_balance' => 'debit',
            'is_cash' => true,
        ]);
        $sales = Account::query()->create([
            'tenant_id' => $tenant->id,
            'code' => '4010',
            'name' => 'Penjualan',
            'type' => 'revenue',
            'normal_balance' => 'credit',
        ]);

        $entry = app(PostJournalEntryAction::class)->handle([
            'tenant_id' => $tenant->id,
            'entry_number' => 'JE-0001',
            'entry_date' => '2026-05-21',
            'description' => 'Penjualan POS',
        ], [
            ['account_id' => $cash->id, 'debit' => 150000, 'credit' => 0],
            ['account_id' => $sales->id, 'debit' => 0, 'credit' => 150000],
        ]);

        $this->assertTrue($entry->isBalanced());
        $this->assertCount(2, $entry->lines);

        $this->expectException(InvalidArgumentException::class);

        app(PostJournalEntryAction::class)->handle([
            'tenant_id' => $tenant->id,
            'entry_number' => 'JE-0002',
            'entry_date' => '2026-05-21',
        ], [
            ['account_id' => $cash->id, 'debit' => 100000, 'credit' => 0],
            ['account_id' => $sales->id, 'debit' => 0, 'credit' => 90000],
        ]);
    }

    public function test_inventory_movement_records_stock_in_value(): void
    {
        $tenant = Tenant::query()->create([
            'name' => 'Retail Contoh',
            'slug' => 'retail-contoh',
        ]);
        $branch = Branch::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Utama',
            'code' => 'UTM',
        ]);
        $warehouse = Warehouse::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'name' => 'Gudang Utama',
            'code' => 'GDU',
        ]);
        $unit = Unit::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Pieces',
            'symbol' => 'pcs',
        ]);
        $product = Product::query()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'SKU-001',
            'name' => 'Produk Contoh',
            'cost_price' => 50000,
            'selling_price' => 80000,
        ]);

        $movement = InventoryMovement::query()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'movement_number' => 'STK-IN-0001',
            'movement_type' => 'purchase',
            'movement_at' => now(),
            'quantity_in' => 10,
            'unit_cost' => 50000,
            'total_cost' => 500000,
        ]);

        $this->assertSame('10.0000', $movement->quantity_in);
        $this->assertSame('500000.00', $movement->total_cost);
        $this->assertTrue($product->inventoryMovements()->whereKey($movement)->exists());
    }
}
