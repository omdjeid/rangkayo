import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";

interface Product {
	id: number;
	sku: string | null;
	name: string;
	cost_price: string | number;
}
interface Adjustment {
	id: number;
	movement_number: string;
	product: string;
	quantity_in: number;
	quantity_out: number;
	unit_cost: number;
	total_cost: number;
	notes: string | null;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function StockAdjustmentsIndex({
	products,
	adjustments,
	branch,
	warehouse,
}: PageProps<{
	products: Product[];
	adjustments: Adjustment[];
	branch: { name: string };
	warehouse: { name: string };
}>) {
	const form = useForm({
		product_id: products[0]?.id?.toString() ?? "",
		quantity_delta: "1",
		unit_cost: products[0]?.cost_price?.toString() ?? "0",
		reason: "Koreksi stok",
	});
	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("stock-adjustments.store"), { preserveScroll: true });
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Persediaan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Penyesuaian Stok
					</h2>
				</div>
			}
		>
			<Head title="Penyesuaian Stok" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<p className="text-sm font-medium text-cyan-700">
							{branch.name} · {warehouse.name}
						</p>
						<h3 className="mt-1 text-lg font-semibold text-slate-950">
							Koreksi Stok
						</h3>
						<div className="mt-5 space-y-4">
							<FormField label="Produk" required error={form.errors.product_id}>
								<select
									className={inputClass}
									value={form.data.product_id}
									onChange={(e) => form.setData("product_id", e.target.value)}
								>
									{products.map((product) => (
										<option key={product.id} value={product.id}>
											{product.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField
								label="Perubahan Qty"
								required
								hint="Isi positif untuk tambah stok, negatif untuk mengurangi stok."
								error={form.errors.quantity_delta}
							>
								<input
									className={inputClass}
									type="number"
									step="0.0001"
									value={form.data.quantity_delta}
									onChange={(e) =>
										form.setData("quantity_delta", e.target.value)
									}
								/>
							</FormField>
							<FormField
								label="Nilai per Unit"
								required
								error={form.errors.unit_cost}
							>
								<input
									className={inputClass}
									type="number"
									min="0"
									value={form.data.unit_cost}
									onChange={(e) => form.setData("unit_cost", e.target.value)}
								/>
							</FormField>
							<FormField label="Alasan" required error={form.errors.reason}>
								<textarea
									className={inputClass}
									value={form.data.reason}
									onChange={(e) => form.setData("reason", e.target.value)}
								/>
							</FormField>
							<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
								Simpan Penyesuaian
							</button>
						</div>
					</form>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Penyesuaian
						</h3>
						<div className="mt-5 space-y-3">
							{adjustments.map((item) => (
								<div
									key={item.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex justify-between gap-4">
										<div>
											<p className="font-semibold text-slate-950">
												{item.product}
											</p>
											<p className="text-sm text-slate-500">
												{item.movement_number} · {item.notes}
											</p>
										</div>
										<p className="font-bold text-slate-950">
											{formatCurrency(item.total_cost)}
										</p>
									</div>
									<p className="mt-3 text-sm text-slate-600">
										Masuk {formatNumber(item.quantity_in)} · Keluar{" "}
										{formatNumber(item.quantity_out)} ×{" "}
										{formatCurrency(item.unit_cost)}
									</p>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
