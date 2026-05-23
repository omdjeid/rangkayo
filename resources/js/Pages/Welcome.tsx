import type { PageProps } from "@/types";
import { Head, Link } from "@inertiajs/react";

const features = [
	"Double-entry accounting",
	"POS auto journal",
	"Multi cabang & gudang",
	"Persediaan perpetual",
];

const metrics = [
	{ label: "Modul inti", value: "8+" },
	{ label: "Cabang", value: "Multi" },
	{ label: "Database", value: "PostgreSQL" },
];

export default function Welcome({ auth }: PageProps) {
	return (
		<>
			<Head title="SaaS Akuntansi + POS" />

			<main className="min-h-screen overflow-hidden bg-slate-950 text-white">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_32%),radial-gradient(circle_at_80%_10%,_rgba(168,85,247,0.22),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#111827_100%)]" />
				<div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />

				<section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-8">
					<nav className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/10 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">
						<Link href="/" className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/20">
								A
							</div>
							<div>
								<p className="text-base font-semibold tracking-tight">
									Akutansia
								</p>
								<p className="text-xs text-slate-300">Akuntansi + POS SaaS</p>
							</div>
						</Link>

						<div className="flex items-center gap-3">
							{auth.user ? (
								<Link
									href={route("dashboard")}
									className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-xl shadow-white/10 transition hover:-translate-y-0.5"
								>
									Dashboard
								</Link>
							) : (
								<>
									<Link
										href={route("login")}
										className="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 sm:inline-flex"
									>
										Masuk
									</Link>
									<Link
										href={route("register")}
										className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-xl shadow-white/10 transition hover:-translate-y-0.5"
									>
										Mulai
									</Link>
								</>
							)}
						</div>
					</nav>

					<div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
						<div>
							<div className="mb-6 inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-medium text-cyan-100 backdrop-blur-xl">
								Proper stack: Laravel + PostgreSQL + Inertia React
							</div>

							<h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
								Akuntansi dan POS yang nyambung otomatis.
							</h1>
							<p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
								Fondasi SaaS untuk UMKM multi cabang: transaksi kasir masuk ke
								jurnal, stok, HPP, dan laporan keuangan tanpa input ulang.
							</p>

							<div className="mt-9 flex flex-col gap-3 sm:flex-row">
								<Link
									href={auth.user ? route("dashboard") : route("register")}
									className="rounded-full bg-cyan-300 px-7 py-4 text-center text-sm font-bold text-slate-950 shadow-2xl shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:bg-cyan-200"
								>
									Buka Dashboard
								</Link>
								<a
									href="#blueprint"
									className="rounded-full border border-white/15 bg-white/10 px-7 py-4 text-center text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
								>
									Lihat Blueprint
								</a>
							</div>

							<div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
								{features.map((feature) => (
									<div
										key={feature}
										className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-slate-200 backdrop-blur-xl"
									>
										✓ {feature}
									</div>
								))}
							</div>
						</div>

						<div
							id="blueprint"
							className="rounded-[2.5rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl"
						>
							<div className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-400">Live blueprint</p>
										<h2 className="text-2xl font-semibold">
											Business Control Center
										</h2>
									</div>
									<div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
										SaaS Ready
									</div>
								</div>

								<div className="mt-8 grid gap-4 sm:grid-cols-3">
									{metrics.map((metric) => (
										<div
											key={metric.label}
											className="rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10"
										>
											<p className="text-2xl font-bold">{metric.value}</p>
											<p className="mt-1 text-xs text-slate-400">
												{metric.label}
											</p>
										</div>
									))}
								</div>

								<div className="mt-6 space-y-3">
									{[
										["POS Pembayaran", "Kas/Bank → Penjualan, HPP → Persediaan"],
										["Stok Masuk", "Persediaan → Kas/Hutang Dagang"],
										["Multi Cabang", "Semua laporan filter by branch_id"],
									].map(([title, desc]) => (
										<div
											key={title}
											className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"
										>
											<p className="font-semibold text-white">{title}</p>
											<p className="mt-1 text-sm text-slate-400">{desc}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}
