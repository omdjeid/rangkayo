<?php

namespace App\Models;

use App\Models\Inventory\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerOverride extends Model
{
    protected $fillable = [tenant_id, contact_id, product_id, price];

    protected function casts(): array
    {
        return [
            price => decimal:2,
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, contact_id);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, product_id);
    }
}
