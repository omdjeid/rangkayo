import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

interface TenantSettings {
	name: string;
	slug: string;
	legal_name: string | null;
	tax_number: string | null;
	business_type: string | null;
	currency_code: string;
	timezone: string;
	receipt_prefix: string;
	invoice_prefix: string;
	default_cash_account_code: string;
	default_bank_account_code: string;
}

export default function TenantSettingsEdit({
	tenant,
}: PageProps<{ tenant: TenantSettings }>) {
	const form = useForm({ ...tenant });

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Usaha Aktif</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Pengaturan Usaha
					</h2>
				</div>
			}
		>
			<Head title="Pengaturan Usaha" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.patch(route("tenant-settings.update"), {
								preserveScroll: true,
							});
						}}
						className="space-y-6"
					>
						<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600">
									Profil usaha
								</p>
								<h3 className="mt-2 text-lg font-bold text-slate-950">
									Identitas & default transaksi
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									Data ini dipakai untuk dokumen invoice, struk, dan default
									pembukuan tenant.
								</p>
							</div>
							<div className="mt-5 grid gap-4 md:grid-cols-2">
								<FormField label="Nama Usaha" required error={form.errors.name}>
									<input
										className={inputClass}
										value={form.data.name}
										onChange={(e) => form.setData("name", e.target.value)}
									/>
								</FormField>
								<FormField label="Legal Name" error={form.errors.legal_name}>
									<input
										className={inputClass}
										value={form.data.legal_name ?? ""}
										onChange={(e) => form.setData("legal_name", e.target.value)}
									/>
								</FormField>
								<FormField label="NPWP" error={form.errors.tax_number}>
									<input
										className={inputClass}
										value={form.data.tax_number ?? ""}
										onChange={(e) => form.setData("tax_number", e.target.value)}
									/>
								</FormField>
								<FormField
									label="Tipe Bisnis"
									error={form.errors.business_type}
								>
									<input
										className={inputClass}
										value={form.data.business_type ?? ""}
										onChange={(e) =>
											form.setData("business_type", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Currency"
									required
									error={form.errors.currency_code}
								>
									<input
										className={inputClass}
										value={form.data.currency_code}
										onChange={(e) =>
											form.setData(
												"currency_code",
												e.target.value.toUpperCase(),
											)
										}
									/>
								</FormField>
								<FormField
									label="Timezone"
									required
									error={form.errors.timezone}
								>
									<input
										className={inputClass}
										value={form.data.timezone}
										onChange={(e) => form.setData("timezone", e.target.value)}
									/>
								</FormField>
								<FormField
									label="Prefix Struk"
									required
									error={form.errors.receipt_prefix}
								>
									<input
										className={inputClass}
										value={form.data.receipt_prefix}
										onChange={(e) =>
											form.setData("receipt_prefix", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Prefix Invoice"
									required
									error={form.errors.invoice_prefix}
								>
									<input
										className={inputClass}
										value={form.data.invoice_prefix}
										onChange={(e) =>
											form.setData("invoice_prefix", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Kode Akun Kas"
									required
									error={form.errors.default_cash_account_code}
								>
									<input
										className={inputClass}
										value={form.data.default_cash_account_code}
										onChange={(e) =>
											form.setData("default_cash_account_code", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Kode Akun Bank"
									required
									error={form.errors.default_bank_account_code}
								>
									<input
										className={inputClass}
										value={form.data.default_bank_account_code}
										onChange={(e) =>
											form.setData("default_bank_account_code", e.target.value)
										}
									/>
								</FormField>
							</div>
						</section>

						<div className="sticky bottom-4 flex justify-end">
							<button
								disabled={form.processing}
								className="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-xl shadow-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
							>
								Simpan Pengaturan
							</button>
						</div>
					</form>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
