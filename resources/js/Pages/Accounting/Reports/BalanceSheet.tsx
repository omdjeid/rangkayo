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
	start_date: string | null;
	end_date: string;
	branch_id: number | null;
}

const inputClass =
	"rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function Section({
	title,
	rows,
	total,
}: {
	title: string;
	rows: ReportRow[];
	total: number;
}) {
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
				<div className="flex justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
					<span>Total {title}</span>
					<span>{formatCurrency(total)}</span>
				</div>
			</div>
		</section>
	);
}

export default function BalanceSheet({
	filters,
	branches,
	assets,
	liabilities,
	equity,
	totalAssets,
	totalLiabilities,
	totalEquity,
}: PageProps<{
	filters: Filters;
	branches: Branch[];
	assets: ReportRow[];
	liabilities: ReportRow[];
	equity: ReportRow[];
	totalAssets: number;
	totalLiabilities: number;
	totalEquity: number;
}>) {
	const [form, setForm] = useState({
		end_date: filters.end_date,
		branch_id: filters.branch_id?.toString() ?? "",
	});

	function apply() {
		router.get(route("reports.balance-sheet"), form, { preserveState: true });
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Reports</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Neraca
					</h2>
				</div>
			}
		>
			<Head title="Neraca" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="grid gap-3 md:grid-cols-3">
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
					<div className="grid gap-5 lg:grid-cols-2">
						<Section title="Aset" rows={assets} total={totalAssets} />
						<div className="space-y-5">
							<Section
								title="Kewajiban"
								rows={liabilities}
								total={totalLiabilities}
							/>
							<Section title="Ekuitas" rows={equity} total={totalEquity} />
							<section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-300">
								<div className="flex justify-between text-xl font-bold">
									<span>Total Kewajiban + Ekuitas</span>
									<span>{formatCurrency(totalLiabilities + totalEquity)}</span>
								</div>
							</section>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
