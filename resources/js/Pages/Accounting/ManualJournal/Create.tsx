import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

interface Account {
	id: number;
	code: string;
	name: string;
	type: string;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function ManualJournalCreate({
	accounts,
}: PageProps<{ accounts: Account[] }>) {
	const form = useForm({
		entry_date: new Date().toISOString().slice(0, 10),
		description: "",
		lines: [
			{
				account_id: accounts[0]?.id ?? "",
				description: "",
				debit: "0",
				credit: "0",
			},
			{
				account_id: accounts[1]?.id ?? accounts[0]?.id ?? "",
				description: "",
				debit: "0",
				credit: "0",
			},
		],
	});
	function setLine(index: number, key: string, value: string | number) {
		form.setData(
			"lines",
			form.data.lines.map((line, i) =>
				i === index ? { ...line, [key]: value } : line,
			),
		);
	}
	function addLine() {
		form.setData("lines", [
			...form.data.lines,
			{
				account_id: accounts[0]?.id ?? "",
				description: "",
				debit: "0",
				credit: "0",
			},
		]);
	}
	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("manual-journal.store"));
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Jurnal Manual
					</h2>
				</div>
			}
		>
			<Head title="Jurnal Manual" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<FormField label="Tanggal" required>
								<input
									type="date"
									className={inputClass}
									value={form.data.entry_date}
									onChange={(e) => form.setData("entry_date", e.target.value)}
								/>
							</FormField>
							<FormField label="Keterangan" required>
								<input
									className={inputClass}
									value={form.data.description}
									onChange={(e) => form.setData("description", e.target.value)}
								/>
							</FormField>
						</div>
						<div className="mt-6 space-y-3">
							{form.data.lines.map((line, index) => (
								<div
									key={index}
									className="grid gap-3 rounded-3xl border border-slate-200 bg-white/75 p-4 md:grid-cols-[1.4fr_1fr_0.7fr_0.7fr]"
								>
									<FormField label="Akun">
										<select
											className={inputClass}
											value={line.account_id}
											onChange={(e) =>
												setLine(index, "account_id", Number(e.target.value))
											}
										>
											{accounts.map((account) => (
												<option key={account.id} value={account.id}>
													{account.code} - {account.name}
												</option>
											))}
										</select>
									</FormField>
									<FormField label="Memo">
										<input
											className={inputClass}
											value={line.description}
											onChange={(e) =>
												setLine(index, "description", e.target.value)
											}
										/>
									</FormField>
									<FormField label="Debit">
										<input
											className={inputClass}
											type="number"
											min="0"
											value={line.debit}
											onChange={(e) => setLine(index, "debit", e.target.value)}
										/>
									</FormField>
									<FormField label="Kredit">
										<input
											className={inputClass}
											type="number"
											min="0"
											value={line.credit}
											onChange={(e) => setLine(index, "credit", e.target.value)}
										/>
									</FormField>
								</div>
							))}
						</div>
						<div className="mt-5 flex gap-3">
							<button
								type="button"
								onClick={addLine}
								className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-700 shadow"
							>
								Tambah Baris
							</button>
							<button
								disabled={form.processing}
								className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300"
							>
								Posting Jurnal
							</button>
						</div>
					</form>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
