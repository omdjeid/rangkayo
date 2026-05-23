import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head } from "@inertiajs/react";

interface AuditLog {
	id: number;
	action: string;
	description: string | null;
	branch: string | null;
	user: string | null;
	auditable_type: string | null;
	auditable_id: number | null;
	metadata: Record<string, unknown> | null;
	occurred_at: string | null;
}

export default function AuditLogsIndex({
	auditLogs,
}: PageProps<{ auditLogs: AuditLog[] }>) {
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						Akuntansi Control
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Audit Log
					</h2>
				</div>
			}
		>
			<Head title="Audit Log" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<h3 className="text-lg font-semibold text-slate-950">
									Riwayat Aktivitas Penting
								</h3>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
									Audit log mencatat posting jurnal, lock periode, dan aktivitas
									kontrol akuntansi. Ini menjadi dasar traceability untuk SaaS
									akuntansi production.
								</p>
							</div>
							<div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
								{auditLogs.length} aktivitas terakhir
							</div>
						</div>

						<div className="mt-6 space-y-3">
							{auditLogs.length === 0 && (
								<div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">
									Belum ada audit log.
								</div>
							)}
							{auditLogs.map((auditLog) => (
								<article
									key={auditLog.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
												{auditLog.action}
											</p>
											<h4 className="mt-1 font-semibold text-slate-950">
												{auditLog.description ?? "Aktivitas sistem"}
											</h4>
											<p className="mt-2 text-sm text-slate-500">
												{auditLog.user ?? "System"} ·{" "}
												{auditLog.branch ?? "Semua cabang"} ·{" "}
												{auditLog.occurred_at ?? "-"}
											</p>
										</div>
										{auditLog.auditable_type && (
											<div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
												#{auditLog.auditable_id} ·{" "}
												{auditLog.auditable_type.split("\\").pop()}
											</div>
										)}
									</div>
								</article>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
