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
				<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.patch(route("tenant-settings.update"), {
								preserveScroll: true,
							});
						}}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<div className="grid gap-4 md:grid-cols-2">
							<FormField label="Nama Usaha" required>
								<input
									className={inputClass}
									value={form.data.name}
									onChange={(e) => form.setData("name", e.target.value)}
								/>
							</FormField>
							<FormField label="Legal Name">
								<input
									className={inputClass}
									value={form.data.legal_name ?? ""}
									onChange={(e) => form.setData("legal_name", e.target.value)}
								/>
							</FormField>
							<FormField label="NPWP">
								<input
									className={inputClass}
									value={form.data.tax_number ?? ""}
									onChange={(e) => form.setData("tax_number", e.target.value)}
								/>
							</FormField>
							<FormField label="Tipe Bisnis">
								<input
									className={inputClass}
									value={form.data.business_type ?? ""}
									onChange={(e) =>
										form.setData("business_type", e.target.value)
									}
								/>
							</FormField>
							<FormField label="Currency">
								<input
									className={inputClass}
									value={form.data.currency_code}
									onChange={(e) =>
										form.setData("currency_code", e.target.value)
									}
								/>
							</FormField>
							<FormField label="Timezone">
								<input
									className={inputClass}
									value={form.data.timezone}
									onChange={(e) => form.setData("timezone", e.target.value)}
								/>
							</FormField>
							<FormField label="Prefix Struk">
								<input
									className={inputClass}
									value={form.data.receipt_prefix}
									onChange={(e) =>
										form.setData("receipt_prefix", e.target.value)
									}
								/>
							</FormField>
							<FormField label="Prefix Invoice">
								<input
									className={inputClass}
									value={form.data.invoice_prefix}
									onChange={(e) =>
										form.setData("invoice_prefix", e.target.value)
									}
								/>
							</FormField>
							<FormField label="Kode Akun Kas">
								<input
									className={inputClass}
									value={form.data.default_cash_account_code}
									onChange={(e) =>
										form.setData("default_cash_account_code", e.target.value)
									}
								/>
							</FormField>
							<FormField label="Kode Akun Bank">
								<input
									className={inputClass}
									value={form.data.default_bank_account_code}
									onChange={(e) =>
										form.setData("default_bank_account_code", e.target.value)
									}
								/>
							</FormField>
						</div>
						<button className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
							Simpan Pengaturan
						</button>
					</form>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
