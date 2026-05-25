import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, router, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";

interface TaxRate {
	id: number;
	name: string;
	code: string;
	rate: number;
	account: string | null;
	input_account: string | null;
	is_default: boolean;
	is_active: boolean;
}

interface Account {
	id: number;
	code: string;
	name: string;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function TaxesIndex({
	taxRates,
	outputAccounts,
	inputAccounts,
}: PageProps<{
	taxRates: TaxRate[];
	outputAccounts: Account[];
	inputAccounts: Account[];
}>) {
	const form = useForm({
		name: "PPN 11%",
		code: "PPN11",
		rate: "11",
		account_id:
			outputAccounts
				.find((account) => account.code === "2020")
				?.id?.toString() ??
			outputAccounts[0]?.id?.toString() ??
			"",
		input_account_id:
			inputAccounts
				.find((account) => account.code === "1070")
				?.id?.toString() ??
			inputAccounts[0]?.id?.toString() ??
			"",
		is_default: taxRates.length === 0,
	});
	const activeCount = taxRates.filter((taxRate) => taxRate.is_active).length;
	const defaultTaxRate = taxRates.find((taxRate) => taxRate.is_default);

	function submit(event: FormEvent) {
		event.preventDefault();
		form.post(route("taxes.store"), {
			preserveScroll: true,
			onSuccess: () =>
				form.reset(
					"name",
					"code",
					"rate",
					"account_id",
					"input_account_id",
					"is_default",
				),
		});
	}

	function updateTaxRate(taxRate: TaxRate, next: Partial<TaxRate>) {
		router.patch(
			route("taxes.update", taxRate.id),
			{
				is_active: next.is_active ?? taxRate.is_active,
				is_default: next.is_default ?? taxRate.is_default,
			},
			{ preserveScroll: true },
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Pajak
					</h2>
				</div>
			}
		>
			<Head title="Pajak" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.45fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold text-slate-950">
									Tambah Tarif Pajak
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									Pajak keluaran masuk ke hutang pajak, sedangkan pajak masukan
									masuk ke akun aset pajak masukan.
								</p>
							</div>
							<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
								PPN/Non-PPN
							</span>
						</div>
						<div className="mt-5 space-y-4">
							<FormField label="Nama pajak" required error={form.errors.name}>
								<input
									className={inputClass}
									placeholder="Contoh: PPN 11%"
									value={form.data.name}
									onChange={(event) => form.setData("name", event.target.value)}
								/>
							</FormField>
							<div className="grid gap-3 md:grid-cols-2">
								<FormField label="Kode" required error={form.errors.code}>
									<input
										className={inputClass}
										placeholder="PPN11"
										value={form.data.code}
										onChange={(event) =>
											form.setData("code", event.target.value)
										}
									/>
								</FormField>
								<FormField label="Tarif (%)" required error={form.errors.rate}>
									<input
										className={inputClass}
										type="number"
										min="0"
										max="100"
										step="0.0001"
										value={form.data.rate}
										onChange={(event) =>
											form.setData("rate", event.target.value)
										}
									/>
								</FormField>
							</div>
							<FormField
								label="Akun pajak keluaran"
								hint="Untuk invoice penjualan. Default: 2020 Hutang Pajak."
								error={form.errors.account_id}
							>
								<select
									className={inputClass}
									value={form.data.account_id}
									onChange={(event) =>
										form.setData("account_id", event.target.value)
									}
								>
									<option value="">Pakai akun Hutang Pajak default</option>
									{outputAccounts.map((account) => (
										<option key={account.id} value={account.id}>
											{account.code} - {account.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField
								label="Akun pajak masukan"
								hint="Untuk invoice pembelian. Default: 1070 Pajak Masukan Dibayar Dimuka."
								error={form.errors.input_account_id}
							>
								<select
									className={inputClass}
									value={form.data.input_account_id}
									onChange={(event) =>
										form.setData("input_account_id", event.target.value)
									}
								>
									<option value="">Pakai akun Pajak Masukan default</option>
									{inputAccounts.map((account) => (
										<option key={account.id} value={account.id}>
											{account.code} - {account.name}
										</option>
									))}
								</select>
							</FormField>
							<label className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
								<span>Jadikan tarif default invoice</span>
								<input
									type="checkbox"
									className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
									checked={form.data.is_default}
									onChange={(event) =>
										form.setData("is_default", event.target.checked)
									}
								/>
							</label>
							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Simpan Tarif Pajak
							</button>
						</div>
					</form>

					<section className="space-y-6">
						<div className="grid gap-4 md:grid-cols-3">
							<div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
								<p className="text-sm font-semibold text-slate-500">
									Tarif aktif
								</p>
								<p className="mt-2 text-3xl font-bold text-slate-950">
									{activeCount}
								</p>
							</div>
							<div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur-2xl md:col-span-2">
								<p className="text-sm font-semibold text-slate-500">
									Default invoice
								</p>
								<p className="mt-2 text-xl font-bold text-slate-950">
									{defaultTaxRate
										? `${defaultTaxRate.name} · ${Number(defaultTaxRate.rate)}%`
										: "Belum ada default"}
								</p>
							</div>
						</div>

						<div className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<h3 className="text-lg font-semibold text-slate-950">
								Daftar Tarif Pajak
							</h3>
							<div className="mt-5 space-y-3">
								{taxRates.map((taxRate) => (
									<article
										key={taxRate.id}
										className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-sm shadow-slate-200/70"
									>
										<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
											<div>
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-semibold text-slate-950">
														{taxRate.name}
													</p>
													{taxRate.is_default && (
														<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
															Default
														</span>
													)}
													<span
														className={`rounded-full px-3 py-1 text-xs font-bold ${taxRate.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
													>
														{taxRate.is_active ? "Aktif" : "Nonaktif"}
													</span>
												</div>
												<p className="mt-1 text-sm text-slate-500">
													{taxRate.code} · Keluaran:{" "}
													{taxRate.account ?? "Akun default"}
												</p>
												<p className="mt-1 text-sm text-slate-500">
													Masukan: {taxRate.input_account ?? "Akun default"}
												</p>
											</div>
											<div className="text-left md:text-right">
												<p className="text-2xl font-bold text-slate-950">
													{Number(taxRate.rate)}%
												</p>
												<div className="mt-3 flex flex-wrap justify-start gap-2 md:justify-end">
													<button
														type="button"
														disabled={taxRate.is_default}
														onClick={() =>
															updateTaxRate(taxRate, { is_default: true })
														}
														className="rounded-2xl bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
													>
														Jadikan Default
													</button>
													<button
														type="button"
														onClick={() =>
															updateTaxRate(taxRate, {
																is_active: !taxRate.is_active,
															})
														}
														className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
													>
														{taxRate.is_active ? "Nonaktifkan" : "Aktifkan"}
													</button>
												</div>
											</div>
										</div>
									</article>
								))}
								{taxRates.length === 0 && (
									<p className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-500">
										Belum ada tarif pajak. Tambahkan PPN atau pajak usaha lain
										untuk mulai memakai pajak di invoice.
									</p>
								)}
							</div>
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
