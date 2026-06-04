<?php

namespace App\Http\Controllers\Api;

use App\Models\Inventory\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends ApiController
{
    public function stock(Request $request): JsonResponse
    {
        $context = $this->tenant($request);
        $tenant = $context->tenant;
        $warehouseId = $request->integer('warehouse_id');

        $products = Product::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'sku', 'name', 'selling_price', 'wholesale_price'])
            ->map(function ($product) use ($warehouseId) {
                return [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'selling_price' => (float) $product->selling_price,
                    'wholesale_price' => (float) $product->wholesale_price,
                    'stock' => $product->stockOnHand($warehouseId),
                ];
            });

        return $this->success($products);
    }
}
