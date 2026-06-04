import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler, useRef } from "react";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

interface TenantSettings {
	id: number;
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
	logo_url: string | null;
}

export default function TenantSettingsEdit({
	tenant,
}: PageProps<{ tenant: TenantSettings }>) {
	const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
		_method: "PATCH",
		name: tenant.name,
		legal_name: tenant.legal_name ?? "",
		tax_number: tenant.tax_number ?? "",
		business_type: tenant.business_type ?? "",
		currency_code: tenant.currency_code,
		timezone: tenant.timezone,
		receipt_prefix: tenant.receipt_prefix,
		invoice_prefix: tenant.invoice_prefix,
		default_cash_account_code: tenant.default_cash_account_code,
		default_bank_account_code: tenant.default_bank_account_code,
		logo: null as File | null,
	});

	const logoInputRef = useRef<HTMLInputElement>(null);

	const submit: FormEventHandler = (e) => {
		e.preventDefault();
		post(route("tenant-settings.update"), {
			preserveScroll: true,
			forceFormData: true,
		});
	};

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
					<form onSubmit={submit} className="space-y-6">
						<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600">
									Profil usaha
								</p>
								<h3 className="mt-2 text-lg font-bold text-slate-950">
									Identitas &amp; default transaksi
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									Data ini dipakai untuk dokumen invoice, struk, dan default
									pembukuan tenant.
								</p>
							</div>

							{/* Logo Upload Section */}
							<div className="mt-6">
								<p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600">
									Logo Usaha
								</p>
								<p className="mt-1 text-sm text-slate-500">
									Logo akan tampil di struk dan invoice. Format gambar, maks 2 MB.
								</p>
								<div className="mt-3 flex items-center gap-4">
									{tenant.logo_url && (
										<img
											src={tenant.logo_url}
											alt="Logo usaha"
											className="h-16 w-16 rounded-xl border border-slate-200 object-contain bg-white"
										/>
									)}
									<div className="flex-1">
										<input
											ref={logoInputRef}
											type="file"
											accept="image/*"
											className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100"
											onChange={(e) => {
												const file = e.target.files?.[0] ?? null;
												setData("logo", file);
											}}
										/>
										{errors.logo && (
											<p className="mt-1 text-sm text-red-600">{errors.logo}</p>
										)}
									</div>
								</div>
							</div>

							<div className="mt-5 grid gap-4 md:grid-cols-2">
								<FormField label="Nama Usaha" required error={errors.name}>
									<input
										className={inputClass}
										value={data.name}
										onChange={(e) => setData("name", e.target.value)}
									/>
								</FormField>
								<FormField label="Legal Name" error={errors.legal_name}>
									<input
										className={inputClass}
										value={data.legal_name ?? ""}
										onChange={(e) => setData("legal_name", e.target.value)}
									/>
								</FormField>
								<FormField label="NPWP" error={errors.tax_number}>
									<input
										className={inputClass}
										value={data.tax_number ?? ""}
										onChange={(e) => setData("tax_number", e.target.value)}
									/>
								</FormField>
								<FormField
									label="Tipe Bisnis"
									error={errors.business_type}
								>
									<input
										className={inputClass}
										value={data.business_type ?? ""}
										onChange={(e) =>
											setData("business_type", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Currency"
									required
									error={errors.currency_code}
								>
									<input
										className={inputClass}
										value={data.currency_code}
										onChange={(e) =>
											setData(
												"currency_code",
												e.target.value.toUpperCase(),
											)
										}
									/>
								</FormField>
								<FormField
									label="Timezone"
									required
									error={errors.timezone}
								>
									<input
										className={inputClass}
										value={data.timezone}
										onChange={(e) => setData("timezone", e.target.value)}
									/>
								</FormField>
								<FormField
									label="Prefix Struk"
									required
									error={errors.receipt_prefix}
								>
									<input
										className={inputClass}
										value={data.receipt_prefix}
										onChange={(e) =>
											setData("receipt_prefix", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Prefix Invoice"
									required
									error={errors.invoice_prefix}
								>
									<input
										className={inputClass}
										value={data.invoice_prefix}
										onChange={(e) =>
											setData("invoice_prefix", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Kode Akun Kas"
									required
									error={errors.default_cash_account_code}
								>
									<input
										className={inputClass}
										value={data.default_cash_account_code}
										onChange={(e) =>
											setData("default_cash_account_code", e.target.value)
										}
									/>
								</FormField>
								<FormField
									label="Kode Akun Bank"
									required
									error={errors.default_bank_account_code}
								>
									<input
										className={inputClass}
										value={data.default_bank_account_code}
										onChange={(e) =>
											setData("default_bank_account_code", e.target.value)
										}
									/>
								</FormField>
							</div>
						</section>

						<div className="sticky bottom-4 flex justify-end">
							<button
								disabled={processing}
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
