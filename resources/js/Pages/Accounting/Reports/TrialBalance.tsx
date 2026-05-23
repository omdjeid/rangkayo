import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head } from "@inertiajs/react";

interface TrialRow {
	id: number;
	code: string;
	name: string;
	debit: number;
	credit: number;
}

export default function TrialBalance({
	accounts,
	totalDebit,
	totalCredit,
}: PageProps<{
	accounts: TrialRow[];
	totalDebit: number;
	totalCredit: number;
}>) {
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Reports</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Neraca Saldo
					</h2>
				</div>
			}
		>
			<Head title="Neraca Saldo" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-100 text-slate-500">
								<tr>
									<th className="px-5 py-4">Akun</th>
									<th className="px-5 py-4 text-right">Debit</th>
									<th className="px-5 py-4 text-right">Kredit</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{accounts.map((account) => (
									<tr key={account.id}>
										<td className="px-5 py-4 font-semibold text-slate-900">
											{account.code} - {account.name}
										</td>
										<td className="px-5 py-4 text-right">
											{formatCurrency(account.debit)}
										</td>
										<td className="px-5 py-4 text-right">
											{formatCurrency(account.credit)}
										</td>
									</tr>
								))}
								<tr className="bg-slate-950 text-white">
									<td className="px-5 py-4 font-bold">Total</td>
									<td className="px-5 py-4 text-right font-bold">
										{formatCurrency(totalDebit)}
									</td>
									<td className="px-5 py-4 text-right font-bold">
										{formatCurrency(totalCredit)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
