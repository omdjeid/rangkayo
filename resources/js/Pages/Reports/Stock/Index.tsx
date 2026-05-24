import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, router } from "@inertiajs/react";
import { useState } from "react";

interface Branch {
	id: number;
	name: string;
	code: string | null;
}

interface Warehouse {
	id: number;
	branch_id: number;
	name: string;
	code: string | null;
}

interface Summary {
	products: number;
	stock_on_hand: number;
	stock_value: number;
	low_stock: number;
}

interface StockRow {
	product_id: number;
	sku: string | null;
	product: string;
	unit: string | null;
	branch: string;
	warehouse: string;
	quantity_in: number;
	quantity_out: number;
	stock_on_hand: number;
	minimum_stock: number;
	unit_cost: number;
	stock_value: number;
	status: "ok" | "low" | "out";
}

const inputClass =
	"rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function statusLabel(status: StockRow["status"]) {
	if (status === "out") return "Habis";
	if (status === "low") return "Menipis";

	return "Aman";
}

export default function StockReportIndex({
	filters,
	branches,
	warehouses,
	summary,
	rows,
	isBranchScoped,
}: PageProps<{
	filters: {
		branch_id: number | null;
		warehouse_id: number | null;
		as_of_date: string;
	};
	branches: Branch[];
	warehouses: Warehouse[];
	summary: Summary;
	rows: StockRow[];
	isBranchScoped: boolean;
}>) {
	const [form, setForm] = useState({
		branch_id: filters.branch_id?.toString() ?? "",
		warehouse_id: filters.warehouse_id?.toString() ?? "",
		as_of_date: filters.as_of_date,
	});

	function apply() {
		router.get(route("reports.stock"), form, { preserveState: true });
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Laporan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Stok per Cabang/Gudang
					</h2>
				</div>
			}
		>
			<Head title="Laporan Stok" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="grid gap-3 md:grid-cols-4">
							<select
								className={inputClass}
								value={form.branch_id}
								disabled={isBranchScoped}
								onChange={(e) =>
									setForm({
										...form,
										branch_id: e.target.value,
										warehouse_id: "",
									})
								}
							>
								<option value="">Semua cabang</option>
								{branches.map((branch) => (
									<option key={branch.id} value={branch.id}>
										{branch.name}
									</option>
								))}
							</select>
							<select
								className={inputClass}
								value={form.warehouse_id}
								onChange={(e) =>
									setForm({ ...form, warehouse_id: e.target.value })
								}
							>
								<option value="">Semua gudang</option>
								{warehouses.map((warehouse) => (
									<option key={warehouse.id} value={warehouse.id}>
										{warehouse.name}
									</option>
								))}
							</select>
							<input
								className={inputClass}
								type="date"
								value={form.as_of_date}
								onChange={(e) =>
									setForm({ ...form, as_of_date: e.target.value })
								}
							/>
							<button
								onClick={apply}
								className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300"
							>
								Terapkan
							</button>
						</div>
					</section>

					<section className="grid gap-4 md:grid-cols-4">
						{[
							["Produk", formatNumber(summary.products)],
							["Qty on hand", formatNumber(summary.stock_on_hand)],
							["Nilai stok", formatCurrency(summary.stock_value)],
							["Stok menipis", formatNumber(summary.low_stock)],
						].map(([label, value]) => (
							<div
								key={label}
								className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70"
							>
								<p className="text-sm text-slate-500">{label}</p>
								<p className="mt-2 text-3xl font-bold text-slate-950">
									{value}
								</p>
							</div>
						))}
					</section>

					<section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[980px] text-left text-sm">
								<thead className="bg-slate-100 text-slate-500">
									<tr>
										<th className="px-5 py-4">Produk</th>
										<th className="px-5 py-4">Cabang</th>
										<th className="px-5 py-4">Gudang</th>
										<th className="px-5 py-4 text-right">Masuk</th>
										<th className="px-5 py-4 text-right">Keluar</th>
										<th className="px-5 py-4 text-right">On hand</th>
										<th className="px-5 py-4 text-right">Nilai</th>
										<th className="px-5 py-4 text-right">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{rows.map((row) => (
										<tr
											key={`${row.product_id}-${row.branch}-${row.warehouse}`}
										>
											<td className="px-5 py-4">
												<p className="font-semibold text-slate-950">
													{row.product}
												</p>
												<p className="text-xs text-slate-500">
													{row.sku ?? "Tanpa SKU"} · {row.unit ?? "unit"}
												</p>
											</td>
											<td className="px-5 py-4 text-slate-600">{row.branch}</td>
											<td className="px-5 py-4 text-slate-600">
												{row.warehouse}
											</td>
											<td className="px-5 py-4 text-right">
												{formatNumber(row.quantity_in)}
											</td>
											<td className="px-5 py-4 text-right">
												{formatNumber(row.quantity_out)}
											</td>
											<td className="px-5 py-4 text-right font-bold text-slate-950">
												{formatNumber(row.stock_on_hand)}
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatCurrency(row.stock_value)}
											</td>
											<td className="px-5 py-4 text-right">
												<span
													className={`rounded-full px-3 py-1 text-xs font-bold ${
														row.status === "ok"
															? "bg-emerald-50 text-emerald-700"
															: row.status === "low"
																? "bg-amber-50 text-amber-700"
																: "bg-rose-50 text-rose-700"
													}`}
												>
													{statusLabel(row.status)}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
