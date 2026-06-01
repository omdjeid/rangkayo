import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function QrisSettingsEdit({
	qris,
}: PageProps<{
	qris: {
		merchant_name: string;
		manual_qris_string: string;
		image_url: string;
		status: string;
	};
}>) {
	const form = useForm({
		merchant_name: qris.merchant_name,
		manual_qris_string: qris.manual_qris_string,
		image_url: qris.image_url,
		status: qris.status,
	});

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Pembayaran</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Pengaturan QRIS
					</h2>
				</div>
			}
		>
			<Head title="Pengaturan QRIS" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.put(route("qris-settings.update"), {
								preserveScroll: true,
							});
						}}
						className="space-y-6"
					>
						<section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
							<div className="mb-4">
								<h3 className="text-lg font-bold text-slate-950">
									Konfigurasi QRIS
								</h3>
								<p className="text-sm text-slate-500">
									Atur QRIS untuk menerima pembayaran di POS. Pelanggan akan
									melihat QR code dan melakukan scan untuk membayar.
								</p>
							</div>

							<div className="space-y-4">
								<FormField
									label="Nama Merchant"
									error={form.errors.merchant_name}
								>
									<input
										type="text"
										value={form.data.merchant_name}
										onChange={(e) =>
											form.setData("merchant_name", e.target.value)
										}
										className={inputClass}
										placeholder="Nama toko/merchant"
									/>
								</FormField>

								<FormField
									label="QRIS String"
									hint="Paste EMVCo QRIS string dari payment gateway atau QRIS statis. Biasanya dimulai dengan 000201..."
									error={form.errors.manual_qris_string}
								>
									<textarea
										value={form.data.manual_qris_string}
										onChange={(e) =>
											form.setData("manual_qris_string", e.target.value)
										}
										className={inputClass}
										rows={4}
										placeholder="00020101021126610014COM.GRAB.WWW..."
									/>
								</FormField>

								<FormField
									label="Status"
									error={form.errors.status}
								>
									<select
										value={form.data.status}
										onChange={(e) =>
											form.setData("status", e.target.value)
										}
										className={inputClass}
									>
										<option value="">Nonaktif</option>
										<option value="active">Aktif</option>
									</select>
								</FormField>
							</div>
						</section>

						{/* Preview */}
						{form.data.manual_qris_string && (
							<section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
								<h3 className="text-lg font-bold text-slate-950 mb-3">
									Preview
								</h3>
								<p className="text-sm text-slate-500 mb-3">
									Inilah yang akan dilihat kasir di POS saat memilih
									pembayaran QRIS:
								</p>
								<div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
									{form.data.merchant_name && (
										<p className="font-bold text-slate-900 mb-1">
											{form.data.merchant_name}
										</p>
									)}
									<p className="text-xs text-slate-500 mb-3">
										Scan QRIS di bawah oleh pelanggan
									</p>
									<textarea
										readOnly
										value={form.data.manual_qris_string}
										className="w-full rounded-lg bg-white p-3 font-mono text-xs text-slate-700 border border-slate-200"
										rows={3}
									/>
								</div>
							</section>
						)}

						<div className="sticky bottom-4 flex justify-end">
							<button
								disabled={form.processing}
								className="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-xl shadow-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
							>
								{form.processing ? "Menyimpan..." : "Simpan QRIS"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
