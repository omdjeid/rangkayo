import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { useMemo, useState } from "react";

interface Contact {
	id: number;
	name: string;
	price_level: string;
}

interface Override {
	id: number;
	product_id: number;
	product_name: string;
	price: number;
}

interface Product {
	id: number;
	name: string;
	sku: string | null;
	selling_price: number;
	wholesale_price: number;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function Overrides({
	contact,
	overrides,
	products,
}: PageProps<{ contact: Contact; overrides: Override[]; products: Product[] }>) {
	const form = useForm({
		product_id: "",
		price: "",
	});

	const [deletingId, setDeletingId] = useState<number | null>(null);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("customer-overrides.store", contact.id), {
			preserveScroll: true,
			onSuccess: () => form.reset("product_id", "price"),
		});
	}

	function handleDelete(overrideId: number) {
		if (!confirm("Hapus harga khusus ini?")) return;
		setDeletingId(overrideId);
		router.delete(
			route("customer-overrides.destroy", [contact.id, overrideId]),
			{
				preserveScroll: true,
				onFinish: () => setDeletingId(null),
			},
		);
	}

	function handleProductChange(productId: string) {
		form.setData("product_id", productId);
		if (productId) {
			const product = products.find((p) => p.id === Number(productId));
			if (product) {
				const defaultPrice =
					contact.price_level === "grosir"
						? product.wholesale_price
						: product.selling_price;
				form.setData("price", defaultPrice.toString());
			}
		} else {
			form.setData("price", "");
		}
	}

	const selectedProduct = useMemo(() => {
		if (!form.data.product_id) return null;
		return products.find((p) => p.id === Number(form.data.product_id)) ?? null;
	}, [form.data.product_id, products]);

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Kontak</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Harga Khusus
					</h2>
				</div>
			}
		>
			<Head title={`Harga Khusus \u2014 ${contact.name}`} />

			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.4fr] lg:px-8">
					{/* ── Left: Contact info + Add form ── */}
					<div className="space-y-6">
						{/* Contact card */}
						<div className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-lg font-semibold text-slate-950">
										{contact.name}
									</h3>
									<p className="text-sm text-slate-500">
										Level Harga:{" "}
										<span
											className={`rounded-full px-2 py-0.5 text-xs font-bold ${
												contact.price_level === "grosir"
													? "bg-amber-50 text-amber-700"
													: "bg-cyan-50 text-cyan-700"
											}`}
										>
											{contact.price_level === "grosir"
												? "Grosir"
												: "Retail"}
										</span>
									</p>
								</div>
								<Link
									href={route("contacts.index")}
									className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
								>
									\u2190 Kembali
								</Link>
							</div>
						</div>

						{/* Add override form */}
						<form
							onSubmit={submit}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tambah Harga Khusus
							</h3>
							<div className="mt-5 space-y-4">
								<FormField
									label="Produk"
									required
									error={form.errors.product_id}
								>
									<select
										className={inputClass}
										value={form.data.product_id}
										onChange={(e) =>
											handleProductChange(e.target.value)
										}
									>
										<option value="">\u2014 Pilih Produk \u2014</option>
										{products.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
												{p.sku ? ` (${p.sku})` : ""}
											</option>
										))}
									</select>
								</FormField>

								{selectedProduct && (
									<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
										<p className="font-semibold text-slate-700">
											Harga Default
										</p>
										<div className="mt-2 grid grid-cols-2 gap-2">
											<div>
												<span className="text-slate-500">
													Retail:
												</span>{" "}
												<span className="font-medium text-slate-800">
													{formatCurrency(
														selectedProduct.selling_price,
													)}
												</span>
											</div>
											<div>
												<span className="text-slate-500">
													Grosir:
												</span>{" "}
												<span className="font-medium text-slate-800">
													{formatCurrency(
														selectedProduct.wholesale_price,
													)}
												</span>
											</div>
										</div>
									</div>
								)}

								<FormField
									label="Harga Khusus"
									required
									error={form.errors.price}
								>
									<input
										type="number"
										className={inputClass}
										value={form.data.price}
										onChange={(e) =>
											form.setData("price", e.target.value)
										}
										min={0}
										placeholder="0"
									/>
								</FormField>

								<button
									disabled={form.processing}
									className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
								>
									Simpan Harga Khusus
								</button>
							</div>
						</form>
					</div>

					{/* ── Right: Overrides list ── */}
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Harga Khusus
						</h3>
						<p className="mt-1 text-sm text-slate-500">
							{overrides.length} produk dengan harga khusus
						</p>

						<div className="mt-5 space-y-3">
							{overrides.length === 0 && (
								<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
									<p className="text-sm text-slate-500">
										Belum ada harga khusus untuk kontak ini.
									</p>
									<p className="mt-1 text-xs text-slate-400">
										Gunakan form di sebelah kiri untuk menambahkan.
									</p>
								</div>
							)}

							{overrides.map((override) => {
								const product = products.find(
									(p) => p.id === override.product_id,
								);
								const defaultPrice =
									contact.price_level === "grosir"
										? product?.wholesale_price
										: product?.selling_price;
								const diff =
									defaultPrice != null
										? override.price - defaultPrice
										: null;

								return (
									<div
										key={override.id}
										className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/75 p-5"
									>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-slate-950 truncate">
												{override.product_name}
											</p>
											{product?.sku && (
												<p className="text-xs text-slate-400">
													SKU: {product.sku}
												</p>
											)}
											<div className="mt-1 flex flex-wrap items-center gap-3">
												<span className="text-sm font-bold text-cyan-700">
													{formatCurrency(override.price)}
												</span>
												{defaultPrice != null && (
													<span className="text-xs text-slate-400">
														(default:{" "}
														{formatCurrency(defaultPrice)})
													</span>
												)}
												{diff != null && diff !== 0 && (
													<span
														className={`rounded-full px-2 py-0.5 text-xs font-bold ${
															diff > 0
																? "bg-emerald-50 text-emerald-700"
																: "bg-rose-50 text-rose-700"
														}`}
													>
														{diff > 0 ? "+" : ""}
														{formatCurrency(diff)}
													</span>
												)}
											</div>
										</div>
										<button
											onClick={() => handleDelete(override.id)}
											disabled={deletingId === override.id}
											className="ml-4 shrink-0 rounded-xl border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
										>
											{deletingId === override.id
												? "Menghapus\u2026"
												: "Hapus"}
										</button>
									</div>
								);
							})}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
