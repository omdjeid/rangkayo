import FormField from "@/Components/FormField";
import PlatformLayout from "@/Layouts/PlatformLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

interface PlatformSummary {
	tenants: number;
	active_tenants: number;
	suspended_tenants: number;
	trial_tenants: number;
	total_users: number;
	total_branches: number;
	total_sales: number;
	gross_sales: number;
}

interface TenantRow {
	id: number;
	name: string;
	slug: string;
	legal_name: string | null;
	business_type: string | null;
	currency_code: string;
	timezone: string;
	status: string;
	created_at: string | null;
	owner: { name: string; email: string } | null;
	users_count: number;
	branches_count: number;
	warehouses_count: number;
	products_count: number;
	contacts_count: number;
	invoices_count: number;
	journal_entries_count: number;
	sales_count: number;
	gross_sales: number;
	invoice_total: number;
	subscription: {
		plan_name: string;
		status: string;
		user_limit: number;
		branch_limit: number;
		transaction_limit: number;
		trial_ends_at: string | null;
		current_period_ends_at: string | null;
	} | null;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

const currency = new Intl.NumberFormat("id-ID", {
	currency: "IDR",
	maximumFractionDigits: 0,
	style: "currency",
});

function number(value: number) {
	return new Intl.NumberFormat("id-ID").format(value);
}

function badgeClass(status: string) {
	if (status === "active") return "bg-emerald-100 text-emerald-700";
	if (status === "trial") return "bg-cyan-100 text-cyan-700";
	if (status === "suspended") return "bg-rose-100 text-rose-700";
	return "bg-slate-100 text-slate-600";
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
	return (
		<div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-2xl">
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
			<p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
			<p className="mt-2 text-sm font-medium text-slate-500">{hint}</p>
		</div>
	);
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
	const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
	return (
		<div>
			<div className="flex items-center justify-between text-xs font-bold text-slate-500">
				<span>{number(used)} / {number(limit)}</span>
				<span>{percent}%</span>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
				<div className="h-full rounded-full bg-cyan-400" style={{ width: `${percent}%` }} />
			</div>
		</div>
	);
}

function TenantDrawer({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
	const form = useForm({
		status: tenant.status,
		plan_name: tenant.subscription?.plan_name ?? "Starter",
		subscription_status: tenant.subscription?.status ?? "trial",
		user_limit: tenant.subscription?.user_limit ?? 1,
		branch_limit: tenant.subscription?.branch_limit ?? 1,
		transaction_limit: tenant.subscription?.transaction_limit ?? 1000,
	});

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
			<form
				onClick={(event) => event.stopPropagation()}
				onSubmit={(event) => {
					event.preventDefault();
					form.patch(route("platform.tenants.update", tenant.id), { preserveScroll: true });
				}}
				className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
			>
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600">Detail Tenant</p>
						<h2 className="mt-2 text-2xl font-bold text-slate-950">{tenant.name}</h2>
						<p className="mt-1 text-sm text-slate-500">/{tenant.slug} · dibuat {tenant.created_at ?? "-"}</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">Tutup</button>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-2">
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Owner</p>
						<p className="mt-2 font-bold text-slate-950">{tenant.owner?.name ?? "Belum ada owner"}</p>
						<p className="text-sm text-slate-500">{tenant.owner?.email ?? "-"}</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-4">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Profil</p>
						<p className="mt-2 font-bold text-slate-950">{tenant.business_type ?? "-"}</p>
						<p className="text-sm text-slate-500">{tenant.currency_code} · {tenant.timezone}</p>
					</div>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-3">
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Gudang</p><p className="text-xl font-bold">{number(tenant.warehouses_count)}</p></div>
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Produk</p><p className="text-xl font-bold">{number(tenant.products_count)}</p></div>
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Kontak</p><p className="text-xl font-bold">{number(tenant.contacts_count)}</p></div>
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">POS</p><p className="text-xl font-bold">{number(tenant.sales_count)}</p></div>
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Invoice</p><p className="text-xl font-bold">{number(tenant.invoices_count)}</p></div>
					<div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Jurnal</p><p className="text-xl font-bold">{number(tenant.journal_entries_count)}</p></div>
				</div>

				<div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-sm font-bold text-slate-950">Usage Limit</p>
					<div className="mt-4 space-y-4">
						<div><p className="mb-1 text-xs font-bold text-slate-500">User</p><UsageBar used={tenant.users_count} limit={form.data.user_limit} /></div>
						<div><p className="mb-1 text-xs font-bold text-slate-500">Cabang</p><UsageBar used={tenant.branches_count} limit={form.data.branch_limit} /></div>
						<div><p className="mb-1 text-xs font-bold text-slate-500">Transaksi</p><UsageBar used={tenant.sales_count} limit={form.data.transaction_limit} /></div>
					</div>
				</div>

				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					<FormField label="Status Tenant">
						<select className={inputClass} value={form.data.status} onChange={(event) => form.setData("status", event.target.value)}>
							<option value="active">active</option>
							<option value="suspended">suspended</option>
						</select>
					</FormField>
					<FormField label="Status Paket">
						<select className={inputClass} value={form.data.subscription_status} onChange={(event) => form.setData("subscription_status", event.target.value)}>
							<option value="trial">trial</option>
							<option value="active">active</option>
							<option value="expired">expired</option>
							<option value="suspended">suspended</option>
						</select>
					</FormField>
					<FormField label="Plan"><select className={inputClass} value={form.data.plan_name} onChange={(event) => form.setData("plan_name", event.target.value)}><option value="Starter">Starter</option><option value="Growth">Growth</option></select></FormField>
					<FormField label="Limit User"><input className={inputClass} type="number" value={form.data.user_limit} onChange={(event) => form.setData("user_limit", Number(event.target.value))} /></FormField>
					<FormField label="Limit Cabang"><input className={inputClass} type="number" value={form.data.branch_limit} onChange={(event) => form.setData("branch_limit", Number(event.target.value))} /></FormField>
					<FormField label="Limit Transaksi"><input className={inputClass} type="number" value={form.data.transaction_limit} onChange={(event) => form.setData("transaction_limit", Number(event.target.value))} /></FormField>
				</div>

				<button disabled={form.processing} className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-300 disabled:opacity-60">
					Simpan Perubahan
				</button>
			</form>
		</div>
	);
}

export default function PlatformSuperAdmin({ summary, tenants }: PageProps<{ summary: PlatformSummary; tenants: TenantRow[] }>) {
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
	const [plan, setPlan] = useState("all");
	const [selected, setSelected] = useState<TenantRow | null>(null);

	const plans = useMemo(() => Array.from(new Set(tenants.map((tenant) => tenant.subscription?.plan_name).filter(Boolean))) as string[], [tenants]);
	const filtered = useMemo(() => {
		const q = query.toLowerCase().trim();
		return tenants.filter((tenant) => {
			const subStatus = tenant.subscription?.status ?? tenant.status;
			const planName = tenant.subscription?.plan_name ?? "Starter";
			const matchQuery = !q || [tenant.name, tenant.slug, tenant.owner?.name, tenant.owner?.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
			return matchQuery && (status === "all" || subStatus === status) && (plan === "all" || planName === plan);
		});
	}, [plan, query, status, tenants]);

	return (
		<PlatformLayout>
			<Head title="Platform Admin" />
			<div className="space-y-8">
				<section className="rounded-[2rem] border border-white/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 p-8 text-white shadow-2xl shadow-slate-300">
					<p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-200">Platform Admin</p>
					<h1 className="mt-4 text-4xl font-bold tracking-tight">Tenant Directory</h1>
					<p className="mt-3 max-w-3xl text-sm text-slate-200">Tampilan ringkas untuk mengelola banyak tenant. Klik detail untuk melihat usage, subscription, dan edit limit.</p>
				</section>

				<section className="grid gap-4 lg:grid-cols-4">
					<StatCard label="Tenant" value={number(summary.tenants)} hint={`${number(summary.active_tenants)} active`} />
					<StatCard label="Trial" value={number(summary.trial_tenants)} hint="tenant dalam masa trial" />
					<StatCard label="User" value={number(summary.total_users)} hint={`${number(summary.total_branches)} cabang`} />
					<StatCard label="Omzet POS" value={currency.format(summary.gross_sales)} hint={`${number(summary.total_sales)} transaksi`} />
				</section>

				<section className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
					<div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
						<input className={inputClass} placeholder="Cari tenant, slug, owner, email..." value={query} onChange={(event) => setQuery(event.target.value)} />
						<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
							<option value="all">Semua status</option>
							<option value="trial">Trial</option>
							<option value="active">Active</option>
							<option value="expired">Expired</option>
							<option value="suspended">Suspended</option>
						</select>
						<select className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value)}>
							<option value="all">Semua paket</option>
							{plans.map((item) => <option key={item} value={item}>{item}</option>)}
						</select>
					</div>
				</section>

				<section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-100 text-sm">
							<thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
								<tr>
									<th className="px-5 py-4">Tenant</th>
									<th className="px-5 py-4">Paket</th>
									<th className="px-5 py-4">Usage</th>
									<th className="px-5 py-4">Omzet</th>
									<th className="px-5 py-4">Periode</th>
									<th className="px-5 py-4 text-right">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filtered.map((tenant) => {
									const subStatus = tenant.subscription?.status ?? tenant.status;
									return (
										<tr key={tenant.id} className="hover:bg-cyan-50/40">
											<td className="px-5 py-4">
												<p className="font-bold text-slate-950">{tenant.name}</p>
												<p className="text-xs text-slate-500">/{tenant.slug} · {tenant.owner?.email ?? "no owner"}</p>
											</td>
											<td className="px-5 py-4">
												<div className="space-y-2">
													<span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">{tenant.subscription?.plan_name ?? "Starter"}</span>
													<span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClass(subStatus)}`}>{subStatus}</span>
												</div>
											</td>
											<td className="px-5 py-4 text-slate-600">
												{number(tenant.users_count)}/{number(tenant.subscription?.user_limit ?? 1)} user · {number(tenant.branches_count)}/{number(tenant.subscription?.branch_limit ?? 1)} cabang
											</td>
											<td className="px-5 py-4 font-bold text-slate-950">{currency.format(tenant.gross_sales)}</td>
											<td className="px-5 py-4 text-slate-600">Trial {tenant.subscription?.trial_ends_at ?? "-"}<br />Aktif {tenant.subscription?.current_period_ends_at ?? "-"}</td>
											<td className="px-5 py-4 text-right">
												<button type="button" onClick={() => setSelected(tenant)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Detail</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					{filtered.length === 0 && <p className="p-8 text-center text-sm font-medium text-slate-500">Tidak ada tenant sesuai filter.</p>}
				</section>
			</div>
			{selected && <TenantDrawer tenant={selected} onClose={() => setSelected(null)} />}
		</PlatformLayout>
	);
}
