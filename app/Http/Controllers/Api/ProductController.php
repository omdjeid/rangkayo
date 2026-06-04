<?php

namespace App\Http\Controllers\Api;

use App\Models\Inventory\Product;
use App\Support\CurrentTenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends ApiController
{
    /**
     * GET /api/products
     * List products with pagination and search.
     */
    public function index(Request $request, CurrentTenant $currentTenant): JsonResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $query = Product::query()
            ->where('tenant_id', $tenant->id)
            ->with(['category', 'unit']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        if ($request->filled('category_id')) {
            $query->where('product_category_id', $request->input('category_id'));
        }

        $query->orderBy('name');

        $products = $query->paginate($request->integer('per_page', 15));

        $products->getCollection()->transform(fn (Product $product) => [
            'id' => $product->id,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'name' => $product->name,
            'type' => $product->type,
            'cost_price' => $product->cost_price,
            'selling_price' => $product->selling_price,
            'wholesale_price' => $product->wholesale_price,
            'minimum_stock' => $product->minimum_stock,
            'is_active' => $product->is_active,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
            ] : null,
            'unit' => $product->unit ? [
                'id' => $product->unit->id,
                'name' => $product->unit->name,
            ] : null,
        ]);

        return $this->paginated($products);
    }

    /**
     * GET /api/products/{product}
     * Get a single product.
     */
    public function show(int $product, CurrentTenant $currentTenant): JsonResponse
    {
        $context = $currentTenant->context();
        $tenant = $context->tenant;

        $model = Product::query()
            ->where('tenant_id', $tenant->id)
            ->whereKey($product)
            ->with(['category', 'unit'])
            ->first();

        if (! $model instanceof Product) {
            return $this->error('Product not found', 404);
        }

        return $this->success([
            'id' => $model->id,
            'sku' => $model->sku,
            'barcode' => $model->barcode,
            'name' => $model->name,
            'type' => $model->type,
            'cost_price' => $model->cost_price,
            'selling_price' => $model->selling_price,
            'wholesale_price' => $model->wholesale_price,
            'minimum_stock' => $model->minimum_stock,
            'is_active' => $model->is_active,
            'category' => $model->category ? [
                'id' => $model->category->id,
                'name' => $model->category->name,
            ] : null,
            'unit' => $model->unit ? [
                'id' => $model->unit->id,
                'name' => $model->unit->name,
            ] : null,
        ]);
    }
}
