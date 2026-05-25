import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";
import { useMemo } from "react";
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
	type: TransactionType;
	amount: number;
	description: string;
	cash_account: string;
	counter_account: string;
	branch: string | null;
}

type TransactionType =
	| "income"
	| "owner_capital"
	| "expense"
	| "payable_payment"
	| "asset_purchase"
	| "transfer";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

const transactionTypeOptions: Array<{
	value: TransactionType;
	label: string;
	counterType: string | null;
	hint: string;
}> = [
	{
		value: "income",
		label: "Penerimaan Pendapatan",
		counterType: "revenue",
		hint: "Untuk uang masuk dari pendapatan usaha/non-POS. Akun lawan hanya pendapatan.",
	},
	{
		value: "owner_capital",
		label: "Setoran Modal",
		counterType: "equity",
		hint: "Untuk setoran modal pemilik. Akun lawan hanya ekuitas/modal.",
	},
	{
		value: "expense",
		label: "Pembayaran Beban",
		counterType: "expense",
		hint: "Untuk biaya operasional. Akun lawan hanya beban.",
	},
	{
		value: "payable_payment",
		label: "Bayar Hutang",
		counterType: "liability",
		hint: "Untuk pelunasan hutang. Akun lawan hanya kewajiban/hutang.",
	},
	{
		value: "asset_purchase",
		label: "Beli Aset",
		counterType: "asset",
		hint: "Untuk pembelian aset non-kas. Akun lawan hanya aset non-kas.",
	},
	{
		value: "transfer",
		label: "Transfer Kas/Bank",
		counterType: null,
		hint: "Untuk pemindahan dana antar kas/bank. Akun tujuan hanya kas/bank lain.",
	},
];

function optionFor(type: TransactionType) {
	return (
		transactionTypeOptions.find((option) => option.value === type) ??
		transactionTypeOptions[0]
	);
}

function counterAccountsForType(
	type: TransactionType,
	cashAccountId: string,
	cashAccounts: AccountOption[],
	counterAccounts: AccountOption[],
) {
	if (type === "transfer") {
		return cashAccounts.filter(
			(account) => account.id.toString() !== cashAccountId,
		);
	}

	const counterType = optionFor(type).counterType;

	return counterAccounts.filter(
		(account) =>
			!account.is_cash &&
			account.type !== undefined &&
			account.type === counterType,
	);
}

function firstCounterAccountId(accounts: AccountOption[]) {
	return accounts[0]?.id?.toString() ?? "";
}

function transactionLabel(type: TransactionType) {
	return optionFor(type).label;
}

function transactionAmountSign(type: TransactionType) {
	if (["income", "owner_capital"].includes(type)) return "+";
	if (type === "transfer") return "↔";

	return "-";
}

function transactionBadgeClass(type: TransactionType) {
	if (["income", "owner_capital"].includes(type)) {
		return "bg-emerald-50 text-emerald-700";
	}

	if (type === "transfer") return "bg-cyan-50 text-cyan-700";

	return "bg-rose-50 text-rose-700";
}

export default function CashTransactionsIndex({
	cashAccounts,
	counterAccounts,
	transactions,
}: PageProps<{
	cashAccounts: AccountOption[];
	counterAccounts: AccountOption[];
	transactions: Transaction[];
}>) {
	const defaultCashAccountId = cashAccounts[0]?.id?.toString() ?? "";
	const defaultType: TransactionType = "expense";
	const defaultCounterAccounts = counterAccountsForType(
		defaultType,
		defaultCashAccountId,
		cashAccounts,
		counterAccounts,
	);
	const form = useForm<{
		type: TransactionType;
		cash_account_id: string;
		counter_account_id: string;
		transaction_date: string;
		amount: string;
		description: string;
	}>({
		type: defaultType,
		cash_account_id: defaultCashAccountId,
		counter_account_id: firstCounterAccountId(defaultCounterAccounts),
		transaction_date: new Date().toISOString().slice(0, 10),
		amount: "0",
		description: "",
	});

	const counterAccountOptions = useMemo(
		() =>
			counterAccountsForType(
				form.data.type,
				form.data.cash_account_id,
				cashAccounts,
				counterAccounts,
			),
		[form.data.type, form.data.cash_account_id, cashAccounts, counterAccounts],
	);

	function submit(event: FormEvent) {
		event.preventDefault();
		form.post(route("cash-transactions.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset("amount", "description"),
		});
	}

	function nextCounterAccountId(type: TransactionType, cashAccountId: string) {
		return firstCounterAccountId(
			counterAccountsForType(
				type,
				cashAccountId,
				cashAccounts,
				counterAccounts,
			),
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Kas/Bank
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
							Pilih jenis transaksi yang spesifik agar akun lawan otomatis
							sesuai dengan konteks akuntansi.
						</p>
						<div className="mt-5 space-y-4">
							<FormField
								label="Jenis Transaksi"
								required
								hint="Setiap jenis transaksi punya daftar akun lawan berbeda agar tidak salah klasifikasi."
								error={form.errors.type}
							>
								<select
									className={inputClass}
									value={form.data.type}
									onChange={(event) => {
										const type = event.target.value as TransactionType;
										form.setData((data) => ({
											...data,
											type,
											counter_account_id: nextCounterAccountId(
												type,
												data.cash_account_id,
											),
										}));
									}}
								>
									{transactionTypeOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
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
									onChange={(event) => {
										const cashAccountId = event.target.value;
										form.setData((data) => {
											const options = counterAccountsForType(
												data.type,
												cashAccountId,
												cashAccounts,
												counterAccounts,
											);
											const currentCounterIsValid = options.some(
												(account) =>
													account.id.toString() === data.counter_account_id,
											);

											return {
												...data,
												cash_account_id: cashAccountId,
												counter_account_id: currentCounterIsValid
													? data.counter_account_id
													: firstCounterAccountId(options),
											};
										});
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
								hint={optionFor(form.data.type).hint}
								error={form.errors.counter_account_id}
							>
								<select
									className={inputClass}
									value={form.data.counter_account_id}
									onChange={(event) =>
										form.setData("counter_account_id", event.target.value)
									}
								>
									{counterAccountOptions.map((account) => (
										<option key={account.id} value={account.id}>
											{account.code} - {account.name}
											{account.type ? ` (${account.type})` : ""}
										</option>
									))}
								</select>
								{counterAccountOptions.length === 0 && (
									<p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
										Belum ada akun yang cocok untuk jenis transaksi ini.
										Tambahkan akun di Daftar Akun terlebih dahulu.
									</p>
								)}
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
									onChange={(event) =>
										form.setData("transaction_date", event.target.value)
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
									onChange={(event) =>
										form.setData("amount", event.target.value)
									}
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
									onChange={(event) =>
										form.setData("description", event.target.value)
									}
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
											className={`rounded-2xl px-4 py-2 text-sm font-bold ${transactionBadgeClass(transaction.type)}`}
										>
											{transactionAmountSign(transaction.type)}{" "}
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
