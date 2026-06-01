import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, Link, usePage } from "@inertiajs/react";

interface DashboardProps extends Record<string, unknown> {
	tenant: { name: string };
	branch: { name: string; code: string | null } | null;
	warehouse: { name: string; code: string | null } | null;
	metrics: {
		salesToday: number;
		inventoryValue: number;
		journalDebitPosted: number;
		products: number;
		salesCount: number;
	};
	recentSales: Array<{
		id: number;
		sale_number: string;
		sold_at: string;
		payment_method: string;
		grand_total: string | number;
	}>;
}

export default function Dashboard({
	tenant,
	branch,
	warehouse,
	metrics,
	recentSales,
}: PageProps<DashboardProps>) {
	const scopeLabel = branch
		? `${branch.name}${warehouse ? ` · ${warehouse.name}` : ""}`
		: "Konsolidasi semua cabang";

	const cards = [
		{
			label: "Penjualan hari ini",
			value: formatCurrency(metrics.salesToday),
			caption: `${metrics.salesCount} transaksi total`,
		},
		{
			label: "Nilai movement stok",
			value: formatCurrency(metrics.inventoryValue),
			caption: `${metrics.products} produk aktif`,
		},
		{
			label: "Debit jurnal posted",
			value: formatCurrency(metrics.journalDebitPosted),
			caption: "Total nilai jurnal masuk",
		},
	];

	const { domains } = usePage().props as unknown as { domains: { pos: string } };

	const shortcuts = [
		{
			label: "Buka POS",
			href: `${domains.pos}/pos`,
			caption: "Buat transaksi penjualan",
			external: true,
		},
		{
			label: "Input Stok",
			href: route("stock-in.index"),
			caption: "Catat penerimaan barang",
		},
		{
			label: "Produk",
			href: route("products.index"),
			caption: "Kelola SKU dan harga",
		},
		{
			label: "Jurnal",
			href: route("journal-entries.index"),
			caption: "Review transaksi pembukuan",
		},
	];

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						{tenant.name} · {scopeLabel}
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Dashboard Operasional
					</h2>
				</div>
			}
		>
			<Head title="Dashboard" />

			<div className="min-h-[calc(100vh-9rem)] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-10">
				<div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
					<section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl lg:p-8">
						<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<div className="mb-4 inline-flex rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800">
									Ringkasan operasional
								</div>
								<h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950">
									Pantau penjualan, stok, dan pembukuan{" "}
									{branch ? "cabang" : "semua cabang"} dalam satu tempat.
								</h1>
								<p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
									Gunakan shortcut di bawah untuk membuka modul operasional
									harian.
								</p>
							</div>
							<a
								href={`${domains.pos}/pos`}
								className="rounded-3xl bg-slate-950 px-6 py-5 text-center font-bold text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5"
							>
								Buka POS
							</a>
						</div>
					</section>

					<section className="grid gap-4 md:grid-cols-3">
						{cards.map((card) => (
							<div
								key={card.label}
								className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
							>
								<p className="text-sm font-medium text-slate-500">
									{card.label}
								</p>
								<p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
									{card.value}
								</p>
								<p className="mt-2 text-sm text-slate-500">{card.caption}</p>
							</div>
						))}
					</section>

					<section className="grid gap-4 md:grid-cols-4">
						{shortcuts.map((shortcut) =>
							shortcut.external ? (
								<a
									key={shortcut.label}
									href={shortcut.href}
									className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl transition hover:-translate-y-1"
								>
									<p className="font-semibold text-slate-950">{shortcut.label}</p>
									<p className="mt-2 text-sm text-slate-500">
										{shortcut.caption}
									</p>
								</a>
							) : (
								<Link
									key={shortcut.label}
									href={shortcut.href}
									className="rounded-[1.75rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl transition hover:-translate-y-1"
								>
									<p className="font-semibold text-slate-950">{shortcut.label}</p>
									<p className="mt-2 text-sm text-slate-500">
										{shortcut.caption}
									</p>
								</Link>
							)
						)}
					</section>

					<section className="rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Transaksi POS terakhir
						</h3>
						<div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
							{recentSales.length === 0 && (
								<p className="text-sm text-slate-500">
									Belum ada transaksi POS.
								</p>
							)}
							{recentSales.map((sale) => (
								<div key={sale.id} className="rounded-2xl bg-slate-100/80 p-4">
									<p className="font-semibold text-slate-800">
										{sale.sale_number}
									</p>
									<p className="text-sm text-slate-500">
										{sale.payment_method} · {formatCurrency(sale.grand_total)}
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