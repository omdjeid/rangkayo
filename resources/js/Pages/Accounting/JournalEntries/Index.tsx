import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head } from "@inertiajs/react";

interface Line {
	id: number;
	account: string;
	description: string | null;
	debit: number;
	credit: number;
}

interface Entry {
	id: number;
	entry_number: string;
	entry_date: string;
	description: string | null;
	source_type: string | null;
	branch: string | null;
	debit_total: number;
	credit_total: number;
	lines: Line[];
}

export default function JournalEntriesIndex({
	entries,
}: PageProps<{ entries: Entry[] }>) {
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Jurnal
					</h2>
				</div>
			}
		>
			<Head title="Jurnal" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="space-y-5">
						{entries.map((entry) => (
							<article
								key={entry.id}
								className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="text-sm font-semibold text-cyan-700">
											{entry.entry_number} · {entry.entry_date}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-950">
											{entry.description ?? "-"}
										</h3>
										<p className="text-sm text-slate-500">
											{entry.branch ?? "Semua cabang"} ·{" "}
											{entry.source_type ?? "manual"}
										</p>
									</div>
									<div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right text-sm font-semibold text-emerald-700">
										Balance: {formatCurrency(entry.debit_total)}
									</div>
								</div>

								<div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
									<table className="w-full text-left text-sm">
										<thead className="bg-slate-100 text-slate-500">
											<tr>
												<th className="px-4 py-3">Akun</th>
												<th className="px-4 py-3">Keterangan</th>
												<th className="px-4 py-3 text-right">Debit</th>
												<th className="px-4 py-3 text-right">Kredit</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{entry.lines.map((line) => (
												<tr key={line.id}>
													<td className="px-4 py-3 font-semibold text-slate-800">
														{line.account}
													</td>
													<td className="px-4 py-3 text-slate-600">
														{line.description ?? "-"}
													</td>
													<td className="px-4 py-3 text-right text-slate-700">
														{formatCurrency(line.debit)}
													</td>
													<td className="px-4 py-3 text-right text-slate-700">
														{formatCurrency(line.credit)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</article>
						))}
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
