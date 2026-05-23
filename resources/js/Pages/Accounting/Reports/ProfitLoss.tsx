import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, router } from "@inertiajs/react";
import { useState } from "react";

interface ReportRow {
	code: string;
	name: string;
	balance: number;
}

interface Branch {
	id: number;
	name: string;
	code: string | null;
}

interface Filters {
	start_date: string;
	end_date: string;
	branch_id: number | null;
}

const inputClass =
	"rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function Section({ title, rows }: { title: string; rows: ReportRow[] }) {
	return (
		<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
			<h3 className="text-lg font-semibold text-slate-950">{title}</h3>
			<div className="mt-4 space-y-2">
				{rows.map((row) => (
					<div
						key={`${row.code}-${row.name}`}
						className="flex justify-between rounded-2xl bg-slate-100/80 px-4 py-3 text-sm"
					>
						<span className="font-semibold text-slate-700">
							{row.code} - {row.name}
						</span>
						<span className="font-bold text-slate-950">
							{formatCurrency(row.balance)}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}

export default function ProfitLoss({
	filters,
	branches,
	revenue,
	contraRevenue,
	expenses,
	totalRevenue,
	totalExpense,
	netProfit,
}: PageProps<{
	filters: Filters;
	branches: Branch[];
	revenue: ReportRow[];
	contraRevenue: ReportRow[];
	expenses: ReportRow[];
	totalRevenue: number;
	totalExpense: number;
	netProfit: number;
}>) {
	const [form, setForm] = useState({
		start_date: filters.start_date,
		end_date: filters.end_date,
		branch_id: filters.branch_id?.toString() ?? "",
	});

	function apply() {
		router.get(route("reports.profit-loss"), form, { preserveState: true });
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Reports</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Laba Rugi
					</h2>
				</div>
			}
		>
			<Head title="Laba Rugi" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
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
								onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
							>
								<option value="">Konsolidasi semua cabang</option>
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
					</section>
					<Section title="Pendapatan" rows={revenue} />
					{contraRevenue.length > 0 && (
						<Section title="Pengurang Pendapatan" rows={contraRevenue} />
					)}
					<Section title="Beban / HPP" rows={expenses} />
					<section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-300">
						<div className="flex justify-between">
							<span>Total Pendapatan</span>
							<b>{formatCurrency(totalRevenue)}</b>
						</div>
						<div className="mt-2 flex justify-between">
							<span>Total Beban</span>
							<b>{formatCurrency(totalExpense)}</b>
						</div>
						<div className="mt-4 border-t border-white/10 pt-4 text-xl font-bold flex justify-between">
							<span>Laba Bersih</span>
							<span>{formatCurrency(netProfit)}</span>
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
