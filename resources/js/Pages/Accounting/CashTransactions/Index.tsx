import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";

interface AccountOption {
	id: number;
	code: string;
	name: string;
	type?: string;
	is_cash?: boolean;
}

interface Transaction {
	id: number;
	transaction_number: string;
	transaction_date: string;
	type: "income" | "expense" | "transfer";
	amount: number;
	description: string;
	cash_account: string;
	counter_account: string;
	branch: string | null;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function CashTransactionsIndex({
	cashAccounts,
	counterAccounts,
	transactions,
}: PageProps<{
	cashAccounts: AccountOption[];
	counterAccounts: AccountOption[];
	transactions: Transaction[];
}>) {
	const form = useForm({
		type: "expense",
		cash_account_id: cashAccounts[0]?.id?.toString() ?? "",
		counter_account_id:
			counterAccounts
				.find((account) => account.type === "expense")
				?.id?.toString() ??
			counterAccounts[0]?.id?.toString() ??
			"",
		transaction_date: new Date().toISOString().slice(0, 10),
		amount: "0",
		description: "",
	});

	const counterAccountOptions =
		form.data.type === "transfer" ? cashAccounts : counterAccounts;

	function submit(event: FormEvent) {
		event.preventDefault();
		form.post(route("cash-transactions.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset("amount", "description"),
		});
	}

	function transactionLabel(type: Transaction["type"]) {
		if (type === "income") return "Pemasukan";
		if (type === "transfer") return "Transfer";

		return "Pengeluaran";
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Kas/Bank & Pengeluaran
					</h2>
				</div>
			}
		>
			<Head title="Kas/Bank" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<h3 className="text-lg font-semibold text-slate-950">
							Input Transaksi Kas/Bank
						</h3>
						<p className="mt-1 text-sm text-slate-500">
							Gunakan untuk biaya operasional, pemasukan non-POS, modal
							tambahan, dan transaksi kas/bank sederhana.
						</p>
						<div className="mt-5 space-y-4">
							<FormField
								label="Jenis Transaksi"
								required
								hint="Pengeluaran = akun lawan debit, kas/bank kredit. Pemasukan = kas/bank debit, akun lawan kredit. Transfer = kas/bank tujuan debit, kas/bank asal kredit."
								error={form.errors.type}
							>
								<select
									className={inputClass}
									value={form.data.type}
									onChange={(e) => {
										const type = e.target.value;
										form.setData((data) => ({
											...data,
											type,
											counter_account_id:
												type === "transfer"
													? (cashAccounts
															.find(
																(account) =>
																	account.id.toString() !==
																	data.cash_account_id,
															)
															?.id.toString() ?? "")
													: (counterAccounts
															.find((account) => account.type === "expense")
															?.id.toString() ??
														counterAccounts[0]?.id?.toString() ??
														""),
										}));
									}}
								>
									<option value="expense">Pengeluaran</option>
									<option value="income">Pemasukan</option>
									<option value="transfer">Transfer kas/bank</option>
								</select>
							</FormField>
							<FormField
								label={
									form.data.type === "transfer"
										? "Dari Akun Kas/Bank"
										: "Akun Kas/Bank"
								}
								required
								hint={
									form.data.type === "transfer"
										? "Akun kas/bank asal dana."
										: "Akun yang menerima atau mengeluarkan uang."
								}
								error={form.errors.cash_account_id}
							>
								<select
									className={inputClass}
									value={form.data.cash_account_id}
									onChange={(e) => {
										const cashAccountId = e.target.value;
										form.setData((data) => ({
											...data,
											cash_account_id: cashAccountId,
											counter_account_id:
												data.type === "transfer" &&
												data.counter_account_id === cashAccountId
													? (cashAccounts
															.find(
																(account) =>
																	account.id.toString() !== cashAccountId,
															)
															?.id.toString() ?? "")
													: data.counter_account_id,
										}));
									}}
								>
									{cashAccounts.map((account) => (
										<option key={account.id} value={account.id}>
											{account.code} - {account.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField
								label={
									form.data.type === "transfer"
										? "Ke Akun Kas/Bank"
										: "Akun Lawan"
								}
								required
								hint={
									form.data.type === "transfer"
										? "Akun kas/bank tujuan dana."
										: "Untuk pengeluaran pilih akun beban/aset; untuk pemasukan pilih pendapatan/modal/piutang sesuai kasus."
								}
								error={form.errors.counter_account_id}
							>
								<select
									className={inputClass}
									value={form.data.counter_account_id}
									onChange={(e) =>
										form.setData("counter_account_id", e.target.value)
									}
								>
									{counterAccountOptions.map((account) => (
										<option
											key={account.id}
											value={account.id}
											disabled={
												form.data.type === "transfer" &&
												account.id.toString() === form.data.cash_account_id
											}
										>
											{account.code} - {account.name}
											{account.type ? ` (${account.type})` : ""}
										</option>
									))}
								</select>
							</FormField>
							<FormField
								label="Tanggal"
								required
								error={form.errors.transaction_date}
							>
								<input
									className={inputClass}
									type="date"
									value={form.data.transaction_date}
									onChange={(e) =>
										form.setData("transaction_date", e.target.value)
									}
								/>
							</FormField>
							<FormField
								label="Nominal"
								required
								hint="Nominal transaksi tanpa titik/koma ribuan."
								error={form.errors.amount}
							>
								<input
									className={inputClass}
									type="number"
									min="0.01"
									placeholder="500000"
									value={form.data.amount}
									onChange={(e) => form.setData("amount", e.target.value)}
								/>
							</FormField>
							<FormField
								label="Keterangan"
								required
								hint="Contoh: Bayar listrik toko, Setoran modal owner, Pendapatan jasa."
								error={form.errors.description}
							>
								<textarea
									className={inputClass}
									rows={3}
									placeholder="Bayar listrik toko"
									value={form.data.description}
									onChange={(e) => form.setData("description", e.target.value)}
								/>
							</FormField>
							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Simpan + Buat Jurnal
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Transaksi
						</h3>
						<div className="mt-5 space-y-3">
							{transactions.map((transaction) => (
								<div
									key={transaction.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<p className="font-semibold text-slate-950">
												{transaction.description}
											</p>
											<p className="text-sm text-slate-500">
												{transaction.transaction_number} ·{" "}
												{transaction.transaction_date}
											</p>
											<p className="mt-2 text-sm text-slate-600">
												{transaction.cash_account} ↔{" "}
												{transaction.counter_account}
											</p>
										</div>
										<div
											className={`rounded-2xl px-4 py-2 text-sm font-bold ${transaction.type === "income" ? "bg-emerald-50 text-emerald-700" : transaction.type === "transfer" ? "bg-cyan-50 text-cyan-700" : "bg-rose-50 text-rose-700"}`}
										>
											{transaction.type === "income"
												? "+"
												: transaction.type === "expense"
													? "-"
													: "↔"}{" "}
											{formatCurrency(transaction.amount)}
											<span className="ml-2 text-xs font-semibold opacity-80">
												{transactionLabel(transaction.type)}
											</span>
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
