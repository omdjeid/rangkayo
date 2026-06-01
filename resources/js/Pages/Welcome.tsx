import type { PageProps } from "@/types";
import { Head, Link } from "@inertiajs/react";

const benefits = [
	"Kasir jualan, stok langsung berkurang.",
	"Laporan piutang, hutang, dan kas lebih rapi.",
	"Owner bisa pantau cabang tanpa tunggu rekap manual.",
];

const modules = [
	{
		title: "POS kasir",
		description:
			"Transaksi harian terasa ringan untuk kasir, tapi tetap rapi untuk pembukuan.",
	},
	{
		title: "Akuntansi otomatis",
		description:
			"Penjualan, pembelian, pembayaran, dan stok masuk ke jurnal tanpa kerja dua kali.",
	},
	{
		title: "Multi cabang",
		description:
			"Pisahkan outlet, gudang, kasir, dan laporan cabang dalam satu tempat.",
	},
];

const steps = [
	"Daftarkan usaha dan cabang pertama.",
	"Masukkan produk, kas/bank, dan tim kasir.",
	"Mulai jualan dari POS, laporan ikut bergerak otomatis.",
];

export default function Welcome({ auth }: PageProps) {
	const dashboardHref = auth.user ? "https://app.rangkayo.my.id/dashboard" : "https://app.rangkayo.my.id/register";

	return (
		<>
			<Head title="RangKayo — POS dan Akuntansi untuk Usaha yang Tumbuh" />

			<main className="min-h-screen overflow-hidden bg-white text-slate-950">
				<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,_rgba(34,211,238,0.16),_transparent_32%),radial-gradient(circle_at_88%_12%,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_48%,_#eef7fb_100%)]" />

				<section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-6 lg:px-8">
					<nav className="flex items-center justify-between rounded-[2rem] border border-white/80 bg-white/75 px-4 py-3 shadow-xl shadow-slate-200/70 backdrop-blur-2xl sm:px-5">
						<Link href="/" className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg shadow-slate-300">
								R
							</div>
							<div>
								<p className="text-base font-black tracking-tight text-slate-950">
									RangKayo
								</p>
								<p className="text-xs font-medium text-slate-500">
									POS + Akuntansi UMKM
								</p>
							</div>
						</Link>

						<div className="flex items-center gap-2 sm:gap-3">
							{auth.user ? (
								<Link
									href="https://app.rangkayo.my.id/dashboard"
									className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
								>
									Dashboard
								</Link>
							) : (
								<>
									<Link
										href="https://app.rangkayo.my.id/login"
										className="hidden rounded-full px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
									>
										Masuk
									</Link>
									<Link
										href="https://app.rangkayo.my.id/register"
										className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
									>
										Coba sekarang
									</Link>
								</>
							)}
						</div>
					</nav>

					<div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
						<div>
							<div className="inline-flex rounded-full border border-cyan-100 bg-white/80 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm shadow-cyan-100 backdrop-blur-xl">
								Dibuat untuk usaha yang mau naik kelas
							</div>

							<h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
								Jualan jalan, pembukuan ikut rapi.
							</h1>
							<p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
								RangKayo membantu pemilik usaha mengurus POS, stok, kas,
								invoice, dan laporan keuangan dalam satu sistem yang mudah
								dipakai tim.
							</p>

							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Link
									href={dashboardHref}
									className="rounded-full bg-slate-950 px-7 py-4 text-center text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
								>
									Mulai rapikan usaha
								</Link>
								<a
									href="#fitur"
									className="rounded-full border border-slate-200 bg-white/80 px-7 py-4 text-center text-sm font-black text-slate-700 shadow-lg shadow-slate-200/70 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950"
								>
									Lihat fiturnya
								</a>
							</div>

							<div className="mt-8 grid max-w-2xl gap-3">
								{benefits.map((benefit) => (
									<div
										key={benefit}
										className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm shadow-slate-200/70 backdrop-blur-xl"
									>
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
											✓
										</span>
										{benefit}
									</div>
								))}
							</div>
						</div>

						<div className="relative">
							<div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-cyan-200/50 blur-3xl" />
							<div className="relative rounded-[2.5rem] border border-white/90 bg-white/80 p-4 shadow-2xl shadow-slate-200/90 backdrop-blur-2xl">
								<div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-5 text-white shadow-inner shadow-black/20">
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-sm font-bold text-cyan-200">
												Ringkasan hari ini
											</p>
											<h2 className="mt-1 text-3xl font-black tracking-tight">
												Rp 8.420.000
											</h2>
											<p className="mt-1 text-sm text-white/50">
												Omzet 3 cabang · 128 transaksi
											</p>
										</div>
										<span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
											Live
										</span>
									</div>

									<div className="mt-6 grid gap-3 sm:grid-cols-3">
										{[
											["Kas", "Rp 4,1 jt"],
											["Stok aman", "82%"],
											["Piutang", "Rp 1,8 jt"],
										].map(([label, value]) => (
											<div
												key={label}
												className="rounded-3xl bg-white/[0.08] p-4 ring-1 ring-white/10"
											>
												<p className="text-xl font-black">{value}</p>
												<p className="mt-1 text-xs font-semibold text-white/45">
													{label}
												</p>
											</div>
										))}
									</div>

									<div className="mt-4 space-y-3">
										{[
											[
												"POS Cabang Payakumbuh",
												"Stok berkurang, kas bertambah",
											],
											["Invoice pelanggan", "Piutang dan pajak tercatat"],
											["Pembelian barang", "Gudang dan hutang ikut update"],
										].map(([title, desc]) => (
											<div
												key={title}
												className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"
											>
												<p className="font-bold">{title}</p>
												<p className="mt-1 text-sm text-white/45">{desc}</p>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section
					id="fitur"
					className="relative mx-auto grid w-full max-w-7xl gap-5 px-5 pb-20 sm:px-6 lg:grid-cols-3 lg:px-8"
				>
					{modules.map((module) => (
						<article
							key={module.title}
							className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
								✓
							</div>
							<h3 className="text-xl font-black text-slate-950">
								{module.title}
							</h3>
							<p className="mt-3 text-sm leading-6 text-slate-500">
								{module.description}
							</p>
						</article>
					))}
				</section>

				<section className="relative mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6 lg:px-8">
					<div className="rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl lg:p-8">
						<div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
							<div>
								<p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600">
									Cara mulai
								</p>
								<h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
									Tidak perlu langsung sempurna. Mulai dari yang dipakai hari
									ini.
								</h2>
								<p className="mt-4 text-base leading-7 text-slate-500">
									RangKayo dibuat agar usaha bisa pelan-pelan pindah dari
									catatan manual ke sistem yang lebih rapi, tanpa membuat tim
									bingung.
								</p>
							</div>
							<div className="space-y-3">
								{steps.map((step, index) => (
									<div
										key={step}
										className="flex gap-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-4"
									>
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
											{index + 1}
										</span>
										<p className="pt-1 text-sm font-bold leading-6 text-slate-700">
											{step}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</main>
		</>
	);
}
