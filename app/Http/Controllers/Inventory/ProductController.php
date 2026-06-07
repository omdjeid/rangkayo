<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductCategory;
use App\Models\Inventory\ProductRecipe;
use App\Models\Inventory\Unit;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(CurrentTenant $currentTenant): Response
    {
        $tenant = $currentTenant->tenant();
        $warehouse = $currentTenant->warehouse($tenant);

        return Inertia::render('Inventory/Products/Index', [
            'products' => Product::query()
                ->with(['category:id,name', 'unit:id,symbol', 'recipes.ingredient:id,name,sku'])
                ->where('tenant_id', $tenant->id)
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product): array => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'name' => $product->name,
                    'product_category_id' => $product->product_category_id,
                    'unit_id' => $product->unit_id,
                    'category' => $product->category?->name,
                    'unit' => $product->unit?->symbol,
                    'cost_price' => (float) $product->cost_price,
                    'selling_price' => (float) $product->selling_price,
                    'stock' => $product->stockOnHand($warehouse->id),
                    'is_active' => $product->is_active,
                    'type' => $product->type,
                    'recipes' => $product->recipes->map(fn (ProductRecipe $recipe): array => [
                        'id' => $recipe->id,
                        'ingredient_product_id' => $recipe->ingredient_product_id,
                        'ingredient_name' => $recipe->ingredient?->name,
                        'ingredient_sku' => $recipe->ingredient?->sku,
                        'quantity' => (float) $recipe->quantity,
                        'unit_cost_override' => $recipe->unit_cost_override !== null ? (float) $recipe->unit_cost_override : null,
                        'notes' => $recipe->notes,
                    ]),
                ])->values(),
            'categories' => ProductCategory::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'symbol']),
        ]);
    }

    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate($this->rules($tenant->id));

        $product = Product::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'type' => $validated['type'] ?? 'stock',
        ]);

        $this->syncRecipes($product, $request->input('recipes', []), $tenant->id);

        return back()->with('success', 'Produk berhasil dibuat.');
    }

    public function update(Request $request, CurrentTenant $currentTenant, Product $product): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        abort_unless($product->tenant_id === $tenant->id, 404);

        $validated = $request->validate($this->rules($tenant->id, $product->id));

        $product->update($validated);

        $this->syncRecipes($product, $request->input('recipes', []), $tenant->id);

        return back()->with('success', 'Produk berhasil diupdate.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $tenantId, ?int $ignoreProductId = null): array
    {
        return [
            'sku' => ['nullable', 'string', 'max:64', Rule::unique('products')->where('tenant_id', $tenantId)->ignore($ignoreProductId)],
            'barcode' => ['nullable', 'string', 'max:64', Rule::unique('products')->where('tenant_id', $tenantId)->ignore($ignoreProductId)],
            'name' => ['required', 'string', 'max:255'],
            'product_category_id' => ['nullable', Rule::exists('product_categories', 'id')->where('tenant_id', $tenantId)],
            'unit_id' => ['nullable', Rule::exists('units', 'id')->where('tenant_id', $tenantId)],
            'type' => ['nullable', 'string', 'in:stock,composite'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'recipes' => ['nullable', 'array'],
            'recipes.*.ingredient_product_id' => ['required', 'exists:products,id'],
            'recipes.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'recipes.*.unit_cost_override' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * Replace all recipe rows for a product from the submitted array.
     */
    private function syncRecipes(Product $product, array $recipes, int $tenantId): void
    {
        $product->recipes()->delete();

        foreach ($recipes as $recipe) {
            ProductRecipe::query()->create([
                'tenant_id' => $tenantId,
                'product_id' => $product->id,
                'ingredient_product_id' => $recipe['ingredient_product_id'],
                'quantity' => $recipe['quantity'],
                'unit_cost_override' => $recipe['unit_cost_override'] ?? null,
                'notes' => $recipe['notes'] ?? null,
            ]);
        }
    }
}
