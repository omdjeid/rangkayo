import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head } from "@inertiajs/react";
interface Subscription {
	plan_name: string;
	status: string;
	user_limit: number;
	branch_limit: number;
	transaction_limit: number;
	trial_ends_at: string | null;
	current_period_ends_at: string | null;
}
interface Usage {
	users: number;
	branches: number;
	transactions: number;
}
export default function BillingIndex({
	subscription,
	usage,
	plans,
}: PageProps<{
	subscription: Subscription | null;
	usage: Usage;
	plans: Array<{ code: string; name: string; price: string; limits: string }>;
}>) {
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">SaaS</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Paket & Billing
					</h2>
				</div>
			}
		>
			<Head title="Paket & Billing" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70">
						<h3 className="text-lg font-semibold text-slate-950">
							Paket Aktif
						</h3>
						<p className="mt-2 text-3xl font-bold">
							{subscription?.plan_name ?? "Belum ada paket"}
						</p>
						<p className="text-sm text-slate-500">
							Status: {subscription?.status ?? "-"} · Berakhir:{" "}
							{subscription?.current_period_ends_at ?? "-"}
						</p>
						<div className="mt-5 grid gap-3 md:grid-cols-3">
							<div className="rounded-3xl bg-white/80 p-4">
								User {usage.users}/{subscription?.user_limit ?? "-"}
							</div>
							<div className="rounded-3xl bg-white/80 p-4">
								Cabang {usage.branches}/{subscription?.branch_limit ?? "-"}
							</div>
							<div className="rounded-3xl bg-white/80 p-4">
								Transaksi {usage.transactions}/
								{subscription?.transaction_limit ?? "-"}
							</div>
						</div>
					</section>
					<section className="grid gap-4 md:grid-cols-2">
						{plans.map((plan) => (
							<div
								key={plan.code}
								className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70"
							>
								<p className="text-xl font-bold text-slate-950">{plan.name}</p>
								<p className="mt-2 text-sm text-slate-500">{plan.limits}</p>
								<p className="mt-4 text-sm font-semibold text-cyan-700">
									Upgrade manual via super admin untuk tahap awal.
								</p>
							</div>
						))}
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
