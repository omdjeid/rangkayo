import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, router, useForm } from "@inertiajs/react";

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
	transfer_number: string;
	status: "draft" | "approved" | "received";
	product: string;
	from_warehouse: string;
	to_warehouse: string;
	quantity: number;
	total_cost: number;
	requested_at: string | null;
	approved_at: string | null;
	received_at: string | null;
	requested_by: string | null;
	approved_by: string | null;
	received_by: string | null;
	notes: string | null;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

const statusLabel: Record<Transfer["status"], string> = {
	draft: "Draft",
	approved: "Dikirim",
	received: "Diterima",
};

const statusClass: Record<Transfer["status"], string> = {
	draft: "bg-amber-100 text-amber-700",
	approved: "bg-cyan-100 text-cyan-700",
	received: "bg-emerald-100 text-emerald-700",
};

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

	function approveTransfer(transfer: Transfer) {
		router.patch(
			route("stock-transfers.approve", transfer.id),
			{},
			{ preserveScroll: true },
		);
	}

	function receiveTransfer(transfer: Transfer) {
		router.patch(
			route("stock-transfers.receive", transfer.id),
			{},
			{ preserveScroll: true },
		);
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
							Buat Draft Transfer
						</h3>
						<p className="mt-2 text-sm text-slate-500">
							Draft tidak mengubah stok. Stok asal berkurang saat
							disetujui/dikirim, dan stok tujuan bertambah saat diterima.
						</p>
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
								Simpan Draft Transfer
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
									<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold text-slate-950">
													{item.product}
												</p>
												<span
													className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[item.status]}`}
												>
													{statusLabel[item.status]}
												</span>
											</div>
											<p className="mt-1 text-sm text-slate-500">
												{item.transfer_number} · {item.from_warehouse} →{" "}
												{item.to_warehouse}
											</p>
											<p className="mt-2 text-sm text-slate-600">
												Qty {formatNumber(item.quantity)} · {item.notes}
											</p>
											<p className="mt-2 text-xs text-slate-400">
												Request: {item.requested_by ?? "-"}
												{item.approved_by
													? ` · Kirim: ${item.approved_by}`
													: ""}
												{item.received_by
													? ` · Terima: ${item.received_by}`
													: ""}
											</p>
										</div>
										<div className="space-y-3 text-left sm:text-right">
											<p className="font-bold text-slate-950">
												{formatCurrency(item.total_cost)}
											</p>
											<div className="flex flex-wrap gap-2 sm:justify-end">
												{item.status === "draft" && (
													<button
														type="button"
														onClick={() => approveTransfer(item)}
														className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-300"
													>
														Setujui/Kirim
													</button>
												)}
												{item.status === "approved" && (
													<button
														type="button"
														onClick={() => receiveTransfer(item)}
														className="rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-200"
													>
														Terima
													</button>
												)}
											</div>
										</div>
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
