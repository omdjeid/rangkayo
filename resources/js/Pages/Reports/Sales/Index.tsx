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
interface Summary {
	transactions: number;
	grand_total: number;
	paid_total: number;
}
interface Row {
	branch?: string;
	cashier?: string;
	product?: string;
	transactions?: number;
	quantity?: number;
	total: number;
	cost_total?: number;
	gross_profit?: number;
}
const inputClass =
	"rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";
function Card({ title, rows }: { title: string; rows: Row[] }) {
	return (
		<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
			<h3 className="text-lg font-semibold text-slate-950">{title}</h3>
			<div className="mt-5 space-y-3">
				{rows.map((row, index) => (
					<div
						key={index}
						className="rounded-3xl border border-slate-200 bg-white/75 p-5"
					>
						<div className="flex justify-between gap-3">
							<div>
								<p className="font-semibold text-slate-950">
									{row.branch ?? row.cashier ?? row.product}
								</p>
								<p className="text-sm text-slate-500">
									{row.transactions !== undefined
										? `${formatNumber(row.transactions)} transaksi`
										: `${formatNumber(row.quantity ?? 0)} qty`}
								</p>
							</div>
							<p className="font-bold text-slate-950">
								{formatCurrency(row.total)}
							</p>
						</div>
						{row.gross_profit !== undefined && (
							<p className="mt-2 text-sm text-cyan-700">
								Margin kotor {formatCurrency(row.gross_profit)}
							</p>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
export default function SalesReportIndex({
	filters,
	branches,
	summary,
	byBranch,
	byCashier,
	byProduct,
}: PageProps<{
	filters: { start_date: string; end_date: string; branch_id: number | null };
	branches: Branch[];
	summary: Summary;
	byBranch: Row[];
	byCashier: Row[];
	byProduct: Row[];
}>) {
	const [form, setForm] = useState({
		start_date: filters.start_date,
		end_date: filters.end_date,
		branch_id: filters.branch_id?.toString() ?? "",
	});
	function apply() {
		router.get(route("reports.sales"), form, { preserveState: true });
	}
	function exportUrl(type: "transactions" | "products") {
		const params = new URLSearchParams();
		params.set("start_date", form.start_date);
		params.set("end_date", form.end_date);
		if (form.branch_id) {
			params.set("branch_id", form.branch_id);
		}
		params.set("type", type);
		return `${route("reports.sales.export")}?${params.toString()}`;
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Laporan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Penjualan
					</h2>
				</div>
			}
		>
			<Head title="Laporan Penjualan" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="grid gap-3 md:grid-cols-4">
							<input
								className={inputClass}
								type="date"
								value={form.start_date}
								onChange={(e) =>
									setForm({ ...form, start_date: e.target.value })
								}
							/>
							<input
								className={inputClass}
								type="date"
								value={form.end_date}
								onChange={(e) => setForm({ ...form, end_date: e.target.value })}
							/>
							<select
								className={inputClass}
								value={form.branch_id}
								onChange={(e) =>
									setForm({ ...form, branch_id: e.target.value })
								}
							>
								<option value="">Semua cabang</option>
								{branches.map((branch) => (
									<option key={branch.id} value={branch.id}>
										{branch.name}
									</option>
								))}
							</select>
							<button
								onClick={apply}
								className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300"
							>
								Terapkan
							</button>
						</div>
						<div className="mt-3 flex gap-2">
							<a
								href={exportUrl("transactions")}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 shadow-sm transition hover:bg-cyan-100"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
									<path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
									<path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
								</svg>
								Export Transaksi CSV
							</a>
							<a
								href={exportUrl("products")}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
									<path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
									<path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
								</svg>
								Export Produk CSV
							</a>
						</div>
					</section>
					<section className="grid gap-4 md:grid-cols-3">
						<div className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70">
							<p className="text-sm text-slate-500">Transaksi</p>
							<p className="mt-2 text-3xl font-bold">
								{formatNumber(summary.transactions)}
							</p>
						</div>
						<div className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70">
							<p className="text-sm text-slate-500">Omzet</p>
							<p className="mt-2 text-3xl font-bold">
								{formatCurrency(summary.grand_total)}
							</p>
						</div>
						<div className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70">
							<p className="text-sm text-slate-500">Terbayar</p>
							<p className="mt-2 text-3xl font-bold">
								{formatCurrency(summary.paid_total)}
							</p>
						</div>
					</section>
					<div className="grid gap-6 lg:grid-cols-3">
						<Card title="Per Cabang" rows={byBranch} />
						<Card title="Per Kasir" rows={byCashier} />
						<Card title="Per Produk" rows={byProduct} />
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
