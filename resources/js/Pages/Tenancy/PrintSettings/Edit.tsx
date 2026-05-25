import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import {
	printPresets,
	type PrintPreference,
	type PrintPresetKey,
} from "@/utils/printPresets";
import { Head, useForm } from "@inertiajs/react";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function applyPresetToPreference(
	preference: PrintPreference,
	presetKey: PrintPresetKey,
): PrintPreference {
	const preset =
		printPresets.find((option) => option.key === presetKey) ?? printPresets[0];

	return {
		...preference,
		preset: preset.key,
		width: preset.width,
		height: preset.height,
		margin: preset.margin,
	};
}

function PrintPreferenceFields({
	title,
	description,
	value,
	onChange,
	errors,
}: {
	title: string;
	description: string;
	value: PrintPreference;
	onChange: (value: PrintPreference) => void;
	errors: Partial<Record<keyof PrintPreference, string>>;
}) {
	return (
		<section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm shadow-slate-200/70 backdrop-blur-xl">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h3 className="text-base font-bold text-slate-950">{title}</h3>
					<p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
				</div>
				<span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
					Default cetak
				</span>
			</div>
			<div className="mt-5 grid gap-4 md:grid-cols-4">
				<FormField label="Preset" required error={errors.preset}>
					<select
						className={inputClass}
						value={value.preset}
						onChange={(event) =>
							onChange(
								applyPresetToPreference(
									value,
									event.target.value as PrintPresetKey,
								),
							)
						}
					>
						{printPresets.map((preset) => (
							<option key={preset.key} value={preset.key}>
								{preset.label}
							</option>
						))}
					</select>
				</FormField>
				<FormField
					label="Lebar"
					required
					hint="Contoh: 58mm, 210mm"
					error={errors.width}
				>
					<input
						className={inputClass}
						value={value.width}
						onChange={(event) =>
							onChange({ ...value, width: event.target.value })
						}
					/>
				</FormField>
				<FormField
					label="Tinggi"
					required
					hint="Isi auto atau 297mm"
					error={errors.height}
				>
					<input
						className={inputClass}
						value={value.height}
						onChange={(event) =>
							onChange({ ...value, height: event.target.value })
						}
					/>
				</FormField>
				<FormField
					label="Margin"
					required
					hint="Contoh: 2mm, 12mm"
					error={errors.margin}
				>
					<input
						className={inputClass}
						value={value.margin}
						onChange={(event) =>
							onChange({ ...value, margin: event.target.value })
						}
					/>
				</FormField>
			</div>
			<div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
				<FormField
					label="Koneksi default"
					required
					hint="Browser/USB membuka dialog print di perangkat yang dipakai. Bluetooth thermal bisa direct dari Chrome/Edge Android via Web Bluetooth."
					error={errors.connection}
				>
					<select
						className={inputClass}
						value={value.connection}
						onChange={(event) =>
							onChange({
								...value,
								connection: event.target.value as PrintPreference["connection"],
							})
						}
					>
						<option value="browser">USB / Browser print</option>
						<option value="bluetooth">Bluetooth thermal</option>
					</select>
				</FormField>
				<FormField
					label="Nama printer / catatan device"
					hint="Opsional. Isi nama printer agar kasir tahu device default di HP/tablet/komputer ini."
					error={errors.printer_name}
				>
					<input
						className={inputClass}
						placeholder="Contoh: Epson TM / Thermal Kasir"
						value={value.printer_name}
						onChange={(event) =>
							onChange({ ...value, printer_name: event.target.value })
						}
					/>
				</FormField>
				<label className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
					<input
						type="checkbox"
						className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
						checked={value.auto_print}
						onChange={(event) =>
							onChange({ ...value, auto_print: event.target.checked })
						}
					/>
					<span>Auto buka cetak</span>
				</label>
			</div>
		</section>
	);
}

export default function PrintSettingsEdit({
	tenant,
	printPreferences,
}: PageProps<{
	tenant: { id: number; name: string };
	printPreferences: {
		receipt: PrintPreference;
		invoice: PrintPreference;
	};
}>) {
	const form = useForm({ print_preferences: printPreferences });
	const printErrors = form.errors as Partial<
		Record<
			| "print_preferences.receipt.preset"
			| "print_preferences.receipt.width"
			| "print_preferences.receipt.height"
			| "print_preferences.receipt.margin"
			| "print_preferences.receipt.connection"
			| "print_preferences.receipt.printer_name"
			| "print_preferences.receipt.auto_print"
			| "print_preferences.invoice.preset"
			| "print_preferences.invoice.width"
			| "print_preferences.invoice.height"
			| "print_preferences.invoice.margin"
			| "print_preferences.invoice.connection"
			| "print_preferences.invoice.printer_name"
			| "print_preferences.invoice.auto_print",
			string
		>
	>;

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						Pengaturan · {tenant.name}
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Pengaturan Cetak
					</h2>
				</div>
			}
		>
			<Head title="Pengaturan Cetak" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.patch(route("print-settings.update"), {
								preserveScroll: true,
							});
						}}
						className="space-y-6"
					>
						<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600">
										Preferensi cetak
									</p>
									<h3 className="mt-2 text-lg font-bold text-slate-950">
										Default printer struk & invoice
									</h3>
									<p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
										Preset ini otomatis dipakai saat membuka halaman cetak dari
										HP, tablet, atau komputer. Struk POS bisa dicetak langsung
										ke printer thermal Bluetooth dari browser yang mendukung Web
										Bluetooth (misalnya Chrome/Edge Android), sedangkan
										USB/browser print mengikuti dialog print perangkat yang
										sedang dipakai.
									</p>
								</div>
								<span className="w-fit rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-300">
									Printer & kertas
								</span>
							</div>
							<div className="mt-5 space-y-4">
								<PrintPreferenceFields
									title="Struk POS"
									description="Default untuk halaman struk setelah checkout POS. Thermal Bluetooth memakai koneksi langsung; USB thermal memakai browser print."
									value={form.data.print_preferences.receipt}
									onChange={(receipt) =>
										form.setData("print_preferences", {
											...form.data.print_preferences,
											receipt,
										})
									}
									errors={{
										preset: printErrors["print_preferences.receipt.preset"],
										width: printErrors["print_preferences.receipt.width"],
										height: printErrors["print_preferences.receipt.height"],
										margin: printErrors["print_preferences.receipt.margin"],
										connection:
											printErrors["print_preferences.receipt.connection"],
										printer_name:
											printErrors["print_preferences.receipt.printer_name"],
										auto_print:
											printErrors["print_preferences.receipt.auto_print"],
									}}
								/>
								<PrintPreferenceFields
									title="Invoice"
									description="Default untuk halaman cetak invoice. Cocok diatur ke Printer biasa A4 atau custom paper."
									value={form.data.print_preferences.invoice}
									onChange={(invoice) =>
										form.setData("print_preferences", {
											...form.data.print_preferences,
											invoice,
										})
									}
									errors={{
										preset: printErrors["print_preferences.invoice.preset"],
										width: printErrors["print_preferences.invoice.width"],
										height: printErrors["print_preferences.invoice.height"],
										margin: printErrors["print_preferences.invoice.margin"],
										connection:
											printErrors["print_preferences.invoice.connection"],
										printer_name:
											printErrors["print_preferences.invoice.printer_name"],
										auto_print:
											printErrors["print_preferences.invoice.auto_print"],
									}}
								/>
							</div>
						</section>

						<div className="sticky bottom-4 flex justify-end">
							<button
								disabled={form.processing}
								className="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-xl shadow-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
							>
								Simpan Pengaturan Cetak
							</button>
						</div>
					</form>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
