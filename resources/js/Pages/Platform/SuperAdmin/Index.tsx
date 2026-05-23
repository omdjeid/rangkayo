import FormField from "@/Components/FormField";
import PlatformLayout from "@/Layouts/PlatformLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

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

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint: string;
}) {
	return (
		<div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-2xl">
			<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
				{label}
			</p>
			<p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
				{value}
			</p>
			<p className="mt-2 text-sm font-medium text-slate-500">{hint}</p>
		</div>
	);
}

function UsagePill({
	label,
	used,
	limit,
}: {
	label: string;
	used: number;
	limit: number;
}) {
	const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

	return (
		<div className="rounded-2xl bg-slate-50 p-3">
			<div className="flex items-center justify-between text-xs font-bold text-slate-500">
				<span>{label}</span>
				<span>
					{number(used)} / {number(limit)}
				</span>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
				<div
					className="h-full rounded-full bg-cyan-400"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

function TenantCard({ tenant }: { tenant: TenantRow }) {
	const form = useForm({
		status: tenant.status,
		plan_name: tenant.subscription?.plan_name ?? "Starter",
		subscription_status: tenant.subscription?.status ?? "trial",
		user_limit: tenant.subscription?.user_limit ?? 5,
		branch_limit: tenant.subscription?.branch_limit ?? 1,
		transaction_limit: tenant.subscription?.transaction_limit ?? 1000,
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.patch(route("platform.tenants.update", tenant.id), {
					preserveScroll: true,
				});
			}}
			className="rounded-[1.75rem] border border-slate-200 bg-white/75 p-5 shadow-sm"
		>
			<div className="flex flex-col justify-between gap-4 xl:flex-row">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-lg font-bold text-slate-950">{tenant.name}</p>
						<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
							{tenant.subscription?.status ?? tenant.status}
						</span>
						<span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
							{tenant.subscription?.plan_name ?? "Belum ada paket"}
						</span>
					</div>
					<p className="mt-1 text-sm text-slate-500">
						/{tenant.slug} · {tenant.business_type ?? "tipe belum diisi"} ·{" "}
						{tenant.currency_code} · {tenant.timezone}
					</p>
					<p className="mt-2 text-sm text-slate-500">
						Owner:{" "}
						{tenant.owner
							? `${tenant.owner.name} (${tenant.owner.email})`
							: "belum ada owner"}
					</p>
				</div>
				<div className="grid min-w-full grid-cols-2 gap-3 text-sm xl:min-w-[28rem] xl:grid-cols-4">
					<div className="rounded-2xl bg-slate-50 p-3">
						<p className="font-bold text-slate-950">
							{number(tenant.users_count)}
						</p>
						<p className="text-xs text-slate-500">User</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-3">
						<p className="font-bold text-slate-950">
							{number(tenant.branches_count)}
						</p>
						<p className="text-xs text-slate-500">Cabang</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-3">
						<p className="font-bold text-slate-950">
							{number(tenant.sales_count)}
						</p>
						<p className="text-xs text-slate-500">POS</p>
					</div>
					<div className="rounded-2xl bg-slate-50 p-3">
						<p className="font-bold text-slate-950">
							{currency.format(tenant.gross_sales)}
						</p>
						<p className="text-xs text-slate-500">Omzet POS</p>
					</div>
				</div>
			</div>

			<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
						Data Operasional
					</p>
					<p className="mt-2 text-sm text-slate-600">
						{number(tenant.warehouses_count)} gudang ·{" "}
						{number(tenant.products_count)} produk ·{" "}
						{number(tenant.contacts_count)} kontak
					</p>
				</div>
				<div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
						Akuntansi
					</p>
					<p className="mt-2 text-sm text-slate-600">
						{number(tenant.invoices_count)} invoice ·{" "}
						{number(tenant.journal_entries_count)} jurnal
					</p>
				</div>
				<div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
						Invoice
					</p>
					<p className="mt-2 text-sm text-slate-600">
						{currency.format(tenant.invoice_total)}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
						Periode Paket
					</p>
					<p className="mt-2 text-sm text-slate-600">
						Trial: {tenant.subscription?.trial_ends_at ?? "-"} · Aktif s/d{" "}
						{tenant.subscription?.current_period_ends_at ?? "-"}
					</p>
				</div>
			</div>

			<div className="mt-5 grid gap-3 lg:grid-cols-3">
				<UsagePill
					label="User"
					used={tenant.users_count}
					limit={form.data.user_limit}
				/>
				<UsagePill
					label="Cabang"
					used={tenant.branches_count}
					limit={form.data.branch_limit}
				/>
				<UsagePill
					label="Transaksi POS"
					used={tenant.sales_count}
					limit={form.data.transaction_limit}
				/>
			</div>

			<div className="mt-5 grid gap-3 md:grid-cols-3">
				<FormField label="Status Tenant">
					<select
						className={inputClass}
						value={form.data.status}
						onChange={(event) => form.setData("status", event.target.value)}
					>
						<option value="active">active</option>
						<option value="suspended">suspended</option>
					</select>
				</FormField>
				<FormField label="Plan">
					<input
						className={inputClass}
						value={form.data.plan_name}
						onChange={(event) => form.setData("plan_name", event.target.value)}
					/>
				</FormField>
				<FormField label="Status Paket">
					<select
						className={inputClass}
						value={form.data.subscription_status}
						onChange={(event) =>
							form.setData("subscription_status", event.target.value)
						}
					>
						<option value="trial">trial</option>
						<option value="active">active</option>
						<option value="expired">expired</option>
						<option value="suspended">suspended</option>
					</select>
				</FormField>
			</div>
			<div className="mt-3 grid gap-3 md:grid-cols-3">
				<FormField label="Limit user">
					<input
						className={inputClass}
						type="number"
						value={form.data.user_limit}
						onChange={(event) =>
							form.setData("user_limit", Number(event.target.value))
						}
					/>
				</FormField>
				<FormField label="Limit cabang">
					<input
						className={inputClass}
						type="number"
						value={form.data.branch_limit}
						onChange={(event) =>
							form.setData("branch_limit", Number(event.target.value))
						}
					/>
				</FormField>
				<FormField label="Limit transaksi">
					<input
						className={inputClass}
						type="number"
						value={form.data.transaction_limit}
						onChange={(event) =>
							form.setData("transaction_limit", Number(event.target.value))
						}
					/>
				</FormField>
			</div>
			<button className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
				Simpan Perubahan Paket
			</button>
		</form>
	);
}

export default function SuperAdminIndex({
	summary,
	tenants,
}: PageProps<{ summary: PlatformSummary; tenants: TenantRow[] }>) {
	return (
		<PlatformLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Platform</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Super Admin
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						Monitoring tenant, status subscription, pemakaian limit, dan
						aktivitas operasional SaaS.
					</p>
				</div>
			}
		>
			<Head title="Super Admin" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<StatCard
							label="Tenant"
							value={number(summary.tenants)}
							hint={`${number(summary.active_tenants)} aktif · ${number(summary.suspended_tenants)} suspend`}
						/>
						<StatCard
							label="Trial"
							value={number(summary.trial_tenants)}
							hint="Tenant dalam masa percobaan"
						/>
						<StatCard
							label="User"
							value={number(summary.total_users)}
							hint={`${number(summary.total_branches)} cabang terdaftar`}
						/>
						<StatCard
							label="Omzet POS"
							value={currency.format(summary.gross_sales)}
							hint={`${number(summary.total_sales)} transaksi POS`}
						/>
					</div>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
							<div>
								<h3 className="text-lg font-semibold text-slate-950">
									Tenant SaaS
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									Data ini adalah kontrol platform: status tenant, subscription,
									limit, dan ringkasan penggunaan.
								</p>
							</div>
							<span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">
								{number(tenants.length)} tenant
							</span>
						</div>
						<div className="mt-5 space-y-4">
							{tenants.map((tenant) => (
								<TenantCard key={tenant.id} tenant={tenant} />
							))}
						</div>
					</section>
				</div>
			</div>
		</PlatformLayout>
	);
}
