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
	category: string | null;
	unit: string | null;
	cost_price: number;
	selling_price: number;
	wholesale_price: number;
	stock: number;
	is_active: boolean;
}

interface Option {
	id: number;
	name: string;
	symbol?: string;
}

const emptyProduct = {
	sku: "",
	barcode: "",
	name: "",
	product_category_id: "",
	unit_id: "",
	cost_price: "0",
	selling_price: "0",
	wholesale_price: "0",
};

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function ProductsIndex({
	products,
	categories,
	units,
}: PageProps<{ products: Product[]; categories: Option[]; units: Option[] }>) {
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const form = useForm({
		...emptyProduct,
		unit_id: units[0]?.id?.toString() ?? "",
	});

	const isEditing = editingProduct !== null;

	function submit(event: React.FormEvent) {
		event.preventDefault();

		if (editingProduct) {
			form.patch(route("products.update", editingProduct.id), {
				preserveScroll: true,
				onSuccess: cancelEdit,
			});
			return;
		}

		form.post(route("products.store"), {
			preserveScroll: true,
			onSuccess: () =>
				form.reset("sku", "barcode", "name", "cost_price", "selling_price", "wholesale_price"),
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
			cost_price: product.cost_price.toString(),
			selling_price: product.selling_price.toString(),
			wholesale_price: (product.wholesale_price ?? 0).toString(),
		});
	}

	function cancelEdit() {
		setEditingProduct(null);
		form.clearErrors();
		form.setData({ ...emptyProduct, unit_id: units[0]?.id?.toString() ?? "" });
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
								label=Harga Grosir
								hint=Harga untuk customer grosir. Kosongkan jika tidak ada.
								error={form.errors.wholesale_price}
							>
								<input
									className={inputClass}
									placeholder=65000
									type=number
									min=0
									value={form.data.wholesale_price}
									onChange={(e) =>
										form.setData(wholesale_price, e.target.value)
									}
								/>
							</FormField>

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
