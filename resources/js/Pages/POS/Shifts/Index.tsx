import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";

interface Shift {
	id: number;
	cashier: string | null;
	opened_at: string;
	closed_at: string | null;
	opening_cash: number;
	expected_cash: number;
	actual_cash: number | null;
	cash_difference: number | null;
	status: string;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function CashierShiftsIndex({
	shifts,
}: PageProps<{ shifts: Shift[] }>) {
	const openForm = useForm({ opening_cash: "0", opening_notes: "" });
	const closeForm = useForm({ actual_cash: "0", closing_notes: "" });
	const openShift = shifts.find((shift) => shift.status === "open");
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">POS</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Shift Kasir
					</h2>
				</div>
			}
		>
			<Head title="Shift Kasir" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<div className="space-y-6">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								openForm.post(route("cashier-shifts.open"), {
									preserveScroll: true,
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Buka Shift
							</h3>
							<div className="mt-5 space-y-4">
								<FormField label="Modal Awal Kas">
									<input
										className={inputClass}
										type="number"
										min="0"
										value={openForm.data.opening_cash}
										onChange={(e) =>
											openForm.setData("opening_cash", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Catatan">
									<textarea
										className={inputClass}
										value={openForm.data.opening_notes}
										onChange={(e) =>
											openForm.setData("opening_notes", e.target.value)
										}
									/>
								</FormField>
								<button
									disabled={openForm.processing || Boolean(openShift)}
									className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-50"
								>
									Buka Shift
								</button>
							</div>
						</form>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								closeForm.post(route("cashier-shifts.close"), {
									preserveScroll: true,
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tutup Shift
							</h3>
							<div className="mt-5 space-y-4">
								<FormField label="Kas Aktual">
									<input
										className={inputClass}
										type="number"
										min="0"
										value={closeForm.data.actual_cash}
										onChange={(e) =>
											closeForm.setData("actual_cash", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Catatan">
									<textarea
										className={inputClass}
										value={closeForm.data.closing_notes}
										onChange={(e) =>
											closeForm.setData("closing_notes", e.target.value)
										}
									/>
								</FormField>
								<button
									disabled={closeForm.processing || !openShift}
									className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 disabled:opacity-50"
								>
									Tutup Shift
								</button>
							</div>
						</form>
					</div>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Shift
						</h3>
						<div className="mt-5 space-y-3">
							{shifts.map((shift) => (
								<div
									key={shift.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex justify-between gap-4">
										<div>
											<p className="font-semibold text-slate-950">
												{shift.cashier ?? "Kasir"}
											</p>
											<p className="text-sm text-slate-500">
												{shift.opened_at} · {shift.status}
											</p>
										</div>
										<p className="font-bold text-slate-950">
											{formatCurrency(shift.expected_cash)}
										</p>
									</div>
									<p className="mt-3 text-sm text-slate-600">
										Modal {formatCurrency(shift.opening_cash)} · Aktual{" "}
										{shift.actual_cash === null
											? "-"
											: formatCurrency(shift.actual_cash)}{" "}
										· Selisih{" "}
										{shift.cash_difference === null
											? "-"
											: formatCurrency(shift.cash_difference)}
									</p>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
