<?php

namespace App\Models\Inventory;

use App\Models\Sales\SaleItem;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'product_category_id',
        'unit_id',
        'sku',
        'barcode',
        'name',
        'type',
        'cost_price',
        'selling_price',
        'minimum_stock',
        'wholesale_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'minimum_stock' => 'decimal:4',
            'wholesale_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function inventoryMovements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockTransfers(): HasMany
    {
        return $this->hasMany(StockTransfer::class);
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class);
    }

    public function isComposite(): bool
    {
        return $this->recipes()->exists();
    }

    public function recipeCost(): float
    {
        return (float) $this->recipes()
            ->join('products AS ingredients', 'ingredients.id', '=', 'product_recipes.ingredient_product_id')
            ->sum(DB::raw('product_recipes.quantity * COALESCE(product_recipes.unit_cost_override, ingredients.cost_price)'));
    }

    public function stockOnHand(?int $warehouseId = null): float
    {
        $query = $this->inventoryMovements();

        if ($warehouseId !== null) {
            $query->where('warehouse_id', $warehouseId);
        }

        return (float) $query->sum('quantity_in') - (float) $query->sum('quantity_out');
    }
}
