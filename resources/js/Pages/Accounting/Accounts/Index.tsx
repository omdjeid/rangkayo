import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

interface Account {
	id: number;
	code: string;
	name: string;
	type: string;
	normal_balance: string;
	is_cash: boolean;
	is_system: boolean;
	is_active: boolean;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function AccountsIndex({
	accounts,
}: PageProps<{ accounts: Account[] }>) {
	const form = useForm({
		code: "",
		name: "",
		type: "asset",
		normal_balance: "debit",
		is_cash: false,
	});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		form.post(route("accounts.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset(),
		});
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Chart of Accounts
					</h2>
				</div>
			}
		>
			<Head title="Chart of Accounts" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<h3 className="text-lg font-semibold text-slate-950">
							Tambah Akun
						</h3>
						<div className="mt-5 space-y-4">
							<FormField
								label="Kode Akun"
								required
								hint="Kode unik akun. Contoh: 7010 untuk Pendapatan lain-lain."
								error={form.errors.code}
							>
								<input
									className={inputClass}
									placeholder="7010"
									value={form.data.code}
									onChange={(e) => form.setData("code", e.target.value)}
								/>
							</FormField>
							<FormField
								label="Nama Akun"
								required
								hint="Nama akun yang tampil di jurnal dan laporan."
								error={form.errors.name}
							>
								<input
									className={inputClass}
									placeholder="Pendapatan lain-lain"
									value={form.data.name}
									onChange={(e) => form.setData("name", e.target.value)}
								/>
							</FormField>
							<FormField
								label="Tipe Akun"
								required
								hint="Menentukan posisi akun pada laporan keuangan."
								error={form.errors.type}
							>
								<select
									className={inputClass}
									value={form.data.type}
									onChange={(e) => form.setData("type", e.target.value)}
								>
									{[
										"asset",
										"liability",
										"equity",
										"revenue",
										"contra_revenue",
										"expense",
									].map((type) => (
										<option key={type}>{type}</option>
									))}
								</select>
							</FormField>
							<FormField
								label="Saldo Normal"
								required
								hint="Asset/expense biasanya debit; liability/equity/revenue biasanya credit."
								error={form.errors.normal_balance}
							>
								<select
									className={inputClass}
									value={form.data.normal_balance}
									onChange={(e) =>
										form.setData("normal_balance", e.target.value)
									}
								>
									<option value="debit">debit</option>
									<option value="credit">credit</option>
								</select>
							</FormField>
							<FormField
								label="Penanda Kas/Bank"
								hint="Aktifkan jika akun ini bisa dipakai sebagai metode pembayaran."
								error={form.errors.is_cash}
							>
								<label className="flex items-center gap-3 rounded-2xl bg-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700">
									<input
										type="checkbox"
										checked={form.data.is_cash}
										onChange={(e) => form.setData("is_cash", e.target.checked)}
									/>
									Akun ini adalah kas/bank
								</label>
							</FormField>
							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Simpan Akun
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Akun
						</h3>
						<div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
							<table className="w-full text-left text-sm">
								<thead className="bg-slate-100 text-slate-500">
									<tr>
										<th className="px-4 py-3">Kode</th>
										<th className="px-4 py-3">Nama</th>
										<th className="px-4 py-3">Tipe</th>
										<th className="px-4 py-3">Normal</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{accounts.map((account) => (
										<tr key={account.id}>
											<td className="px-4 py-3 font-semibold text-slate-950">
												{account.code}
											</td>
											<td className="px-4 py-3 text-slate-700">
												{account.name}
											</td>
											<td className="px-4 py-3 text-slate-600">
												{account.type}
											</td>
											<td className="px-4 py-3 text-slate-600">
												{account.normal_balance}
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
