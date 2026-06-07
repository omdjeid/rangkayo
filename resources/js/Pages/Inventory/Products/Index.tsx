import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";
import { useState } from "react";

interface Product {
	id: number;
	sku: string | null;
	barcode: string | null;
	name: string;
	product_category_id: number | null;
	unit_id: number | null;
	type: string;
	category: string | null;
	unit: string | null;
	cost_price: number;
	selling_price: number;
	wholesale_price: number;
	stock: number;
	is_active: boolean;
	recipes: Recipe[];
}

interface Recipe {
	id?: number;
	ingredient_product_id: number;
	quantity: number;
	unit_cost_override: number | null;
	notes: string;
}

interface Option {
	id: number;
	name: string;
	symbol?: string;
}

interface FormData {
	sku: string;
	barcode: string;
	name: string;
	product_category_id: string;
	unit_id: string;
	type: string;
	cost_price: string;
	selling_price: string;
	wholesale_price: string;
	recipes: Recipe[];
}

const emptyProduct: FormData = {
	sku: "",
	barcode: "",
	name: "",
	product_category_id: "",
	unit_id: "",
	type: "stock",
	cost_price: "0",
	selling_price: "0",
	wholesale_price: "0",
	recipes: [],
};

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function ProductsIndex({
	products,
	categories,
	units,
}: PageProps<{ products: Product[]; categories: Option[]; units: Option[] }>) {
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	// Recipes are managed via form.data.recipes

	const form = useForm<FormData>({
		...emptyProduct,
		unit_id: units[0]?.id?.toString() ?? "",
	});

	const isEditing = editingProduct !== null;
	const isComposite = form.data.type === "composite";

	function submit(event: React.FormEvent) {
		event.preventDefault();

		if (editingProduct) {
			form.patch(route("products.update", editingProduct.id), {
				preserveScroll: true,
				onSuccess: () => {
					cancelEdit();
				},
			});
			return;
		}

		form.post(route("products.store"), {
			preserveScroll: true,
			onSuccess: () => {
				form.reset(
					"sku",
					"barcode",
					"name",
					"cost_price",
					"selling_price",
					"wholesale_price"
				);
				},
		});
	}

	function startEdit(product: Product) {
		setEditingProduct(product);
		form.setData({
			sku: product.sku ?? "",
			barcode: product.barcode ?? "",
			name: product.name,
			product_category_id: product.product_category_id?.toString() ?? "",
			unit_id: product.unit_id?.toString() ?? "",
			type: product.type ?? "stock",
			cost_price: product.cost_price.toString(),
			selling_price: product.selling_price.toString(),
			wholesale_price: (product.wholesale_price ?? 0).toString(),
		});
		form.setData(
			"recipes",
			(product.recipes ?? []).map((r) => ({
				id: r.id,
				ingredient_product_id: r.ingredient_product_id,
				quantity: r.quantity,
				unit_cost_override: r.unit_cost_override,
				notes: r.notes ?? "",
			}))
		);
	}

	function cancelEdit() {
		setEditingProduct(null);
		form.clearErrors();
		form.setData({ ...emptyProduct, unit_id: units[0]?.id?.toString() ?? "" });
	}

	function addRecipe() {
		form.setData("recipes", [
			...form.data.recipes,
			{
				ingredient_product_id: 0,
				quantity: 1,
				unit_cost_override: null,
				notes: "",
			},
		]);
	}

	function removeRecipe(index: number) {
		form.setData("recipes", form.data.recipes.filter((_, i) => i !== index));
	}

	function updateRecipe(index: number, field: keyof Recipe, value: unknown) {
		form.setData(
			"recipes",
			form.data.recipes.map((r, i) => (i === index ? { ...r, [field]: value } : r))
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Persediaan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Produk
					</h2>
				</div>
			}
		>
			<Head title="Produk" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.5fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<div className="flex items-center justify-between gap-3">
							<h3 className="text-lg font-semibold text-slate-950">
								{isEditing ? "Edit Produk" : "Tambah Produk"}
							</h3>
							{isEditing && (
								<button
									type="button"
									onClick={cancelEdit}
									className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
								>
									Batal
								</button>
							)}
						</div>
						{isEditing && (
							<p className="mt-2 rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
								Sedang edit: {editingProduct.name}
							</p>
						)}

						<div className="mt-5 space-y-4">
							{/* Product Type Radio */}
							<FormField label="Jenis Produk" hint="Pilih jenis produk: stok atau racikan (composite).">
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="type"
											value="stock"
											checked={form.data.type === "stock"}
											onChange={() => form.setData("type", "stock")}
											className="h-4 w-4 text-cyan-500 border-slate-300 focus:ring-cyan-400"
										/>
										<span className="text-sm font-medium text-slate-700">Stok</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="type"
											value="composite"
											checked={form.data.type === "composite"}
											onChange={() => form.setData("type", "composite")}
											className="h-4 w-4 text-cyan-500 border-slate-300 focus:ring-cyan-400"
										/>
										<span className="text-sm font-medium text-slate-700">Racikan</span>
									</label>
								</div>
							</FormField>

							<FormField
								label="SKU / Kode Produk"
								hint="Kode internal produk. Contoh: BRG-001."
								error={form.errors.sku}
							>
								<input
									className={inputClass}
									placeholder="BRG-001"
									value={form.data.sku}
									onChange={(e) => form.setData("sku", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Barcode"
								hint="Opsional. Bisa diisi kode barcode untuk scan kasir."
								error={form.errors.barcode}
							>
								<input
									className={inputClass}
									placeholder="899xxxxxxxxx"
									value={form.data.barcode}
									onChange={(e) => form.setData("barcode", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Nama Produk"
								required
								hint="Nama yang tampil di POS, stok, dan laporan."
								error={form.errors.name}
							>
								<input
									className={inputClass}
									placeholder="Contoh: Kopi Susu 250ml"
									value={form.data.name}
									onChange={(e) => form.setData("name", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Kategori"
								hint="Kelompok produk untuk laporan penjualan."
								error={form.errors.product_category_id}
							>
								<select
									className={inputClass}
									value={form.data.product_category_id}
									onChange={(e) =>
										form.setData("product_category_id", e.target.value)
									}
								>
									<option value="">Tanpa kategori</option>
									{categories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name}
										</option>
									))}
								</select>
							</FormField>

							<FormField
								label="Unit / Satuan"
								hint="Satuan stok, misalnya pcs, box, kg."
								error={form.errors.unit_id}
							>
								<select
									className={inputClass}
									value={form.data.unit_id}
									onChange={(e) => form.setData("unit_id", e.target.value)}
								>
									<option value="">Tanpa unit</option>
									{units.map((unit) => (
										<option key={unit.id} value={unit.id}>
											{unit.name} ({unit.symbol})
										</option>
									))}
								</select>
							</FormField>

							<FormField
								label="Harga Modal"
								required
								hint="Dipakai untuk menghitung HPP saat transaksi POS."
								error={form.errors.cost_price}
							>
								<input
									className={inputClass}
									placeholder="50000"
									type="number"
									min="0"
									value={form.data.cost_price}
									onChange={(e) => form.setData("cost_price", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Harga Jual"
								required
								hint="Harga yang dipakai di layar POS."
								error={form.errors.selling_price}
							>
								<input
									className={inputClass}
									placeholder="80000"
									type="number"
									min="0"
									value={form.data.selling_price}
									onChange={(e) =>
										form.setData("selling_price", e.target.value)
									}
								/>
							</FormField>

							<FormField
								label="Harga Grosir"
								hint="Harga untuk customer grosir. Kosongkan jika tidak ada."
								error={form.errors.wholesale_price}
							>
								<input
									className={inputClass}
									placeholder="65000"
									type="number"
									min="0"
									value={form.data.wholesale_price}
									onChange={(e) =>
										form.setData("wholesale_price", e.target.value)
									}
								/>
							</FormField>

							{/* Recipe Editor Section */}
							{isComposite && (
								<div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
									<div className="flex items-center justify-between mb-3">
										<div>
											<h4 className="text-sm font-semibold text-amber-900">
												Bahan Racikan
											</h4>
											<p className="text-xs text-amber-700">
												Tambahkan bahan yang diperlukan untuk membuat produk ini.
											</p>
										</div>
										<button
											type="button"
											onClick={addRecipe}
											className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
										>
											+ Tambah Bahan
										</button>
									</div>

									{form.data.recipes.length === 0 && (
										<p className="text-center text-sm text-amber-600 py-4">
											Belum ada bahan ditambahkan. Klik "Tambah Bahan" untuk menambahkan.
										</p>
									)}

									{form.data.recipes.length > 0 && (
										<div className="space-y-3">
											{form.data.recipes.map((recipe, index) => (
												<div
													key={index}
													className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-end"
												>
													{/* Ingredient dropdown */}
													<div className="flex-1">
														<label className="block text-xs font-medium text-slate-600 mb-1">
															Bahan *
														</label>
														<select
															className={inputClass}
															value={recipe.ingredient_product_id || ""}
															onChange={(e) =>
																updateRecipe(index, "ingredient_product_id", Number(e.target.value))
															}
														>
															<option value="">Pilih bahan...</option>
															{products.map((p) => (
																<option key={p.id} value={p.id}>
																	{p.name} ({p.sku ?? "-"})
																</option>
															))}
														</select>
													</div>

													{/* Quantity */}
													<div className="w-full sm:w-28">
														<label className="block text-xs font-medium text-slate-600 mb-1">
															Jumlah *
														</label>
														<input
															type="number"
															min="0.0001"
															step="any"
															className={inputClass}
															value={recipe.quantity}
															onChange={(e) =>
																updateRecipe(index, "quantity", parseFloat(e.target.value) || 0)
															}
														/>
													</div>

													{/* Cost override */}
													<div className="w-full sm:w-32">
														<label className="block text-xs font-medium text-slate-600 mb-1">
															Harga Modal (opsional)
														</label>
														<input
															type="number"
															min="0"
															step="any"
															className={inputClass}
															value={recipe.unit_cost_override ?? ""}
															placeholder="Otomatis"
															onChange={(e) =>
																updateRecipe(
																	index,
																	"unit_cost_override",
																	e.target.value === "" ? null : parseFloat(e.target.value)
																)
															}
														/>
													</div>

													{/* Remove button */}
													<button
														type="button"
														onClick={() => removeRecipe(index)}
														className="flex-shrink-0 rounded-full bg-red-100 p-2 text-red-600 hover:bg-red-200 transition-colors"
														title="Hapus bahan"
													>
														<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
															<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
														</svg>
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							)}

							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								{isEditing ? "Update Produk" : "Simpan Produk"}
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Produk
						</h3>
						<div className="mt-5 grid gap-3">
							{products.map((product) => (
								<div
									key={product.id}
									className={`rounded-3xl border bg-white/75 p-5 ${editingProduct?.id === product.id ? "border-cyan-300 ring-4 ring-cyan-100" : "border-slate-200"}`}
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="font-semibold text-slate-950">
												{product.name}
											</p>
											<p className="text-sm text-slate-500">
												{product.sku ?? "-"} ·{" "}
												{product.category ?? "Tanpa kategori"}
												{product.type === "composite" && (
													<span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
														Racikan
													</span>
												)}
											</p>
										</div>
										<div className="text-left sm:text-right">
											<p className="font-bold text-slate-950">
												{formatCurrency(product.selling_price)}
											</p>
											<p className="text-sm text-slate-500">
												Modal {formatCurrency(product.cost_price)}
											</p>
											{product.wholesale_price > 0 && (
												<p className="text-sm text-amber-600">
													Grosir {formatCurrency(product.wholesale_price)}
												</p>
											)}
										</div>
									</div>
									<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
											Stok tersedia: {formatNumber(product.stock)}{" "}
											{product.unit ?? ""}
										</div>
										<button
											type="button"
											onClick={() => startEdit(product)}
											className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5"
										>
											Edit
										</button>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
