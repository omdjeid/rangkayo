import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";

interface Warehouse {
	id: number;
	branch_id: number | null;
	name: string;
	code: string | null;
}
interface Product {
	id: number;
	sku: string | null;
	name: string;
	cost_price: string | number;
}
interface Transfer {
	id: number;
	movement_number: string;
	product: string;
	warehouse: string;
	quantity_out: number;
	total_cost: number;
	notes: string | null;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function StockTransfersIndex({
	warehouses,
	products,
	transfers,
	currentBranch,
}: PageProps<{
	warehouses: Warehouse[];
	products: Product[];
	transfers: Transfer[];
	currentBranch: { name: string };
}>) {
	const form = useForm({
		from_warehouse_id: warehouses[0]?.id?.toString() ?? "",
		to_warehouse_id: warehouses[1]?.id?.toString() ?? "",
		product_id: products[0]?.id?.toString() ?? "",
		quantity: "1",
		unit_cost: products[0]?.cost_price?.toString() ?? "0",
		notes: "Transfer stok",
	});
	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("stock-transfers.store"), { preserveScroll: true });
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Persediaan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Transfer Stok
					</h2>
				</div>
			}
		>
			<Head title="Transfer Stok" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<p className="text-sm font-medium text-cyan-700">
							{currentBranch.name}
						</p>
						<h3 className="mt-1 text-lg font-semibold text-slate-950">
							Pindahkan Barang
						</h3>
						<div className="mt-5 space-y-4">
							<FormField label="Gudang Asal" required>
								<select
									className={inputClass}
									value={form.data.from_warehouse_id}
									onChange={(e) =>
										form.setData("from_warehouse_id", e.target.value)
									}
								>
									{warehouses.map((warehouse) => (
										<option key={warehouse.id} value={warehouse.id}>
											{warehouse.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField label="Gudang Tujuan" required>
								<select
									className={inputClass}
									value={form.data.to_warehouse_id}
									onChange={(e) =>
										form.setData("to_warehouse_id", e.target.value)
									}
								>
									{warehouses.map((warehouse) => (
										<option key={warehouse.id} value={warehouse.id}>
											{warehouse.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField label="Produk" required>
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
							<div className="grid gap-3 md:grid-cols-2">
								<FormField label="Jumlah" required>
									<input
										className={inputClass}
										type="number"
										min="0.0001"
										step="0.0001"
										value={form.data.quantity}
										onChange={(e) => form.setData("quantity", e.target.value)}
									/>
								</FormField>
								<FormField label="Nilai per Unit">
									<input
										className={inputClass}
										type="number"
										min="0"
										value={form.data.unit_cost}
										onChange={(e) => form.setData("unit_cost", e.target.value)}
									/>
								</FormField>
							</div>
							<FormField label="Catatan">
								<textarea
									className={inputClass}
									value={form.data.notes}
									onChange={(e) => form.setData("notes", e.target.value)}
								/>
							</FormField>
							<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
								Simpan Transfer
							</button>
						</div>
					</form>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Transfer
						</h3>
						<div className="mt-5 space-y-3">
							{transfers.map((item) => (
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
												{item.movement_number} · dari {item.warehouse}
											</p>
										</div>
										<p className="font-bold text-slate-950">
											{formatCurrency(item.total_cost)}
										</p>
									</div>
									<p className="mt-3 text-sm text-slate-600">
										Qty {formatNumber(item.quantity_out)} · {item.notes}
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
