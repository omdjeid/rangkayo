<?php

namespace App\Actions\Sales;

use App\Actions\Accounting\PostJournalEntryAction;
use App\Models\Accounting\Account;
use App\Models\Branch;
use App\Models\Inventory\InventoryMovement;
use App\Models\Inventory\Product;
use App\Models\Sales\CashierShift;
use App\Models\Sales\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CheckoutPosSaleAction
{
    public function __construct(private readonly PostJournalEntryAction $postJournalEntry) {}

    /**
     * @param  array<int, array{product_id:int, quantity:float|int|string}>  $items
     */
    public function handle(Tenant $tenant, Branch $branch, Warehouse $warehouse, array $items, string $paymentMethod = 'cash', ?float $paidTotal = null, ?User $cashier = null, ?CashierShift $shift = null): Sale
    {
        if ($items === []) {
            throw new InvalidArgumentException('POS membutuhkan minimal 1 item.');
        }

        if ($branch->tenant_id !== $tenant->id || $warehouse->tenant_id !== $tenant->id || $warehouse->branch_id !== $branch->id) {
            throw new InvalidArgumentException('Cabang atau gudang tidak sesuai tenant.');
        }

        $cashier ??= Auth::user() instanceof User ? Auth::user() : null;

        if ($shift instanceof CashierShift && ($shift->tenant_id !== $tenant->id || $shift->branch_id !== $branch->id || ! $shift->isOpen())) {
            throw new InvalidArgumentException('Shift kasir tidak valid.');
        }

        return DB::transaction(function () use ($tenant, $branch, $warehouse, $items, $paymentMethod, $paidTotal, $cashier, $shift): Sale {
            $number = 'POS-'.now()->format('YmdHis');
            $saleRows = [];
            $subtotal = 0.0;
            $costTotal = 0.0;

            foreach ($items as $item) {
                $product = Product::query()
                    ->where('tenant_id', $tenant->id)
                    ->whereKey($item['product_id'])
                    ->firstOrFail();
                $quantity = (float) $item['quantity'];

                if ($quantity <= 0) {
                    throw new InvalidArgumentException('Quantity POS harus lebih dari 0.');
                }

                $stock = $product->stockOnHand($warehouse->id);

                if ($stock < $quantity) {
                    throw new InvalidArgumentException("Stok {$product->name} tidak cukup. Tersedia {$stock}.");
                }

                $unitPrice = (float) $product->selling_price;
                $unitCost = (float) $product->cost_price;
                $lineTotal = round($quantity * $unitPrice, 2);
                $lineCost = round($quantity * $unitCost, 2);

                $subtotal += $lineTotal;
                $costTotal += $lineCost;
                $saleRows[] = compact('product', 'quantity', 'unitPrice', 'unitCost', 'lineTotal', 'lineCost');
            }

            $grandTotal = $subtotal;
            $paidTotal ??= $grandTotal;
            $cashAccount = $this->account($tenant, $paymentMethod === 'bank' ? '1020' : '1010');
            $salesAccount = $this->account($tenant, '4010');
            $cogsAccount = $this->account($tenant, '5010');
            $inventoryAccount = $this->account($tenant, '1040');

            $journalEntry = $this->postJournalEntry->handle([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'entry_number' => 'JE-'.$number,
                'entry_date' => today()->toDateString(),
                'source_type' => 'pos_sale',
                'description' => 'Penjualan POS '.$number,
            ], [
                ['account_id' => $cashAccount->id, 'debit' => $grandTotal, 'credit' => 0, 'description' => 'Pembayaran POS'],
                ['account_id' => $salesAccount->id, 'debit' => 0, 'credit' => $grandTotal, 'description' => 'Penjualan POS'],
                ['account_id' => $cogsAccount->id, 'debit' => $costTotal, 'credit' => 0, 'description' => 'HPP POS'],
                ['account_id' => $inventoryAccount->id, 'debit' => 0, 'credit' => $costTotal, 'description' => 'Persediaan keluar'],
            ]);

            /** @var Sale $sale */
            $sale = Sale::query()->create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'warehouse_id' => $warehouse->id,
                'user_id' => $cashier?->id,
                'cashier_shift_id' => $shift?->id,
                'journal_entry_id' => $journalEntry->id,
                'sale_number' => $number,
                'sold_at' => now(),
                'payment_method' => $paymentMethod,
                'subtotal' => $subtotal,
                'grand_total' => $grandTotal,
                'paid_total' => $paidTotal,
                'change_total' => max(0, $paidTotal - $grandTotal),
                'status' => 'paid',
            ]);

            foreach ($saleRows as $row) {
                /** @var Product $product */
                $product = $row['product'];
                $sale->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $row['quantity'],
                    'unit_price' => $row['unitPrice'],
                    'unit_cost' => $row['unitCost'],
                    'line_total' => $row['lineTotal'],
                    'cost_total' => $row['lineCost'],
                ]);

                InventoryMovement::query()->create([
                    'tenant_id' => $tenant->id,
                    'branch_id' => $branch->id,
                    'warehouse_id' => $warehouse->id,
                    'product_id' => $product->id,
                    'journal_entry_id' => $journalEntry->id,
                    'movement_number' => 'STK-OUT-'.$number.'-'.$product->id,
                    'movement_type' => 'pos_sale',
                    'movement_at' => now(),
                    'quantity_in' => 0,
                    'quantity_out' => $row['quantity'],
                    'unit_cost' => $row['unitCost'],
                    'total_cost' => $row['lineCost'],
                    'source_type' => Sale::class,
                    'source_id' => $sale->id,
                    'notes' => 'Stok keluar dari POS',
                ]);
            }

            return $sale->load(['items.product', 'journalEntry.lines.account', 'user', 'cashierShift']);
        });
    }

    private function account(Tenant $tenant, string $code): Account
    {
        /** @var Account|null $account */
        $account = $tenant->accounts()->where('code', $code)->first();

        if (! $account instanceof Account) {
            throw new InvalidArgumentException("Akun {$code} belum tersedia.");
        }

        return $account;
    }
}
