import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, router } from "@inertiajs/react";
import { useState } from "react";

interface Row {
	branch_id: number;
	branch: string;
	code: string | null;
	transactions: number;
	revenue: number;
	cost_total: number;
	gross_profit: number;
	gross_margin: number;
	stock_on_hand: number;
	stock_value: number;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function BranchComparisonIndex({
	filters,
	summary,
	rows,
}: PageProps<{
	filters: { start_date: string; end_date: string };
	summary: {
		branches: number;
		transactions: number;
		revenue: number;
		gross_profit: number;
		stock_value: number;
	};
	rows: Row[];
}>) {
	const [form, setForm] = useState(filters);
	const cards = [
		{ label: "Cabang", value: formatNumber(summary.branches) },
		{ label: "Transaksi", value: formatNumber(summary.transactions) },
		{ label: "Omzet", value: formatCurrency(summary.revenue) },
		{ label: "Laba kotor", value: formatCurrency(summary.gross_profit) },
		{ label: "Nilai stok", value: formatCurrency(summary.stock_value) },
	];

	function applyFilters(e: React.FormEvent) {
		e.preventDefault();
		router.get(route("reports.branch-comparison"), form, {
			preserveState: true,
			preserveScroll: true,
		});
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Laporan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Perbandingan Cabang
					</h2>
				</div>
			}
		>
			<Head title="Perbandingan Cabang" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
									Branch Intelligence
								</p>
								<h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
									Bandingkan performa outlet dalam satu layar.
								</h3>
								<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
									Lihat omzet, jumlah transaksi, laba kotor, margin, dan nilai
									stok per cabang untuk periode yang dipilih.
								</p>
							</div>
							<form
								onSubmit={applyFilters}
								className="grid gap-3 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]"
							>
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
									onChange={(e) =>
										setForm({ ...form, end_date: e.target.value })
									}
								/>
								<button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-300">
									Terapkan
								</button>
							</form>
						</div>
					</section>

					<section className="grid gap-4 md:grid-cols-5">
						{cards.map((card) => (
							<div
								key={card.label}
								className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
							>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
									{card.label}
								</p>
								<p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
									{card.value}
								</p>
							</div>
						))}
					</section>

					<section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-200 text-sm">
								<thead className="bg-white/70 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
									<tr>
										<th className="px-5 py-4">Cabang</th>
										<th className="px-5 py-4 text-right">Transaksi</th>
										<th className="px-5 py-4 text-right">Omzet</th>
										<th className="px-5 py-4 text-right">Laba Kotor</th>
										<th className="px-5 py-4 text-right">Margin</th>
										<th className="px-5 py-4 text-right">Stok</th>
										<th className="px-5 py-4 text-right">Nilai Stok</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{rows.map((row) => (
										<tr key={row.branch_id} className="text-slate-600">
											<td className="px-5 py-4">
												<p className="font-bold text-slate-950">{row.branch}</p>
												<p className="text-xs text-slate-400">
													{row.code ?? "-"}
												</p>
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatNumber(row.transactions)}
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatCurrency(row.revenue)}
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatCurrency(row.gross_profit)}
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{row.gross_margin}%
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatNumber(row.stock_on_hand)}
											</td>
											<td className="px-5 py-4 text-right font-semibold">
												{formatCurrency(row.stock_value)}
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
