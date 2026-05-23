import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

interface Period {
	id: number;
	name: string;
	starts_on: string;
	ends_on: string;
	status: "open" | "locked";
	branch: string | null;
	locked_at: string | null;
	locked_by: string | null;
	notes: string | null;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function AkuntansiPeriodsIndex({
	periods,
}: PageProps<{ periods: Period[] }>) {
	const form = useForm({
		starts_on: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString()
			.slice(0, 10),
		ends_on: new Date().toISOString().slice(0, 10),
		scope: "tenant",
		notes: "",
	});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		form.post(route("accounting-periods.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset("notes"),
		});
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						Akuntansi Control
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Periode Akuntansi
					</h2>
				</div>
			}
		>
			<Head title="Periode Akuntansi" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<div className="rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
							<p className="font-bold">Kunci periode bersifat proteksi.</p>
							<p className="mt-1 leading-6">
								Setelah periode dikunci, jurnal/transaksi bertanggal di rentang
								tersebut tidak bisa diposting. Koreksi harus dilakukan di
								periode terbuka berikutnya.
							</p>
						</div>

						<div className="mt-5 space-y-4">
							<FormField
								label="Tanggal Mulai"
								required
								error={form.errors.starts_on}
							>
								<input
									type="date"
									className={inputClass}
									value={form.data.starts_on}
									onChange={(event) =>
										form.setData("starts_on", event.target.value)
									}
								/>
							</FormField>
							<FormField
								label="Tanggal Akhir"
								required
								error={form.errors.ends_on}
							>
								<input
									type="date"
									className={inputClass}
									value={form.data.ends_on}
									onChange={(event) =>
										form.setData("ends_on", event.target.value)
									}
								/>
							</FormField>
							<FormField
								label="Scope Lock"
								required
								hint="Tenant = semua cabang. Cabang aktif = hanya cabang aktif user saat ini."
								error={form.errors.scope}
							>
								<select
									className={inputClass}
									value={form.data.scope}
									onChange={(event) =>
										form.setData("scope", event.target.value)
									}
								>
									<option value="tenant">Semua cabang</option>
									<option value="branch">Cabang aktif</option>
								</select>
							</FormField>
							<FormField label="Catatan" error={form.errors.notes}>
								<textarea
									className={inputClass}
									rows={3}
									placeholder="Contoh: Closing bulan Mei 2026 sudah review owner."
									value={form.data.notes}
									onChange={(event) =>
										form.setData("notes", event.target.value)
									}
								/>
							</FormField>
							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Kunci Periode
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Periode Terkunci
						</h3>
						<div className="mt-5 space-y-3">
							{periods.length === 0 && (
								<div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">
									Belum ada periode yang dikunci.
								</div>
							)}
							{periods.map((period) => (
								<article
									key={period.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<h4 className="font-semibold text-slate-950">
												{period.name}
											</h4>
											<p className="mt-1 text-sm text-slate-500">
												{period.starts_on} s/d {period.ends_on} ·{" "}
												{period.branch ?? "Semua cabang"}
											</p>
											{period.notes && (
												<p className="mt-2 text-sm text-slate-600">
													{period.notes}
												</p>
											)}
										</div>
										<div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">
											Locked
										</div>
									</div>
									<p className="mt-3 text-xs font-medium text-slate-400">
										Dikunci oleh {period.locked_by ?? "system"} pada{" "}
										{period.locked_at ?? "-"}
									</p>
								</article>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
