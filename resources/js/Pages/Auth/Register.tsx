import InputError from "@/Components/InputError";
import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEventHandler } from "react";

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/60 focus:border-cyan-400 focus:ring-cyan-400";

const steps = [
	{
		title: "Akun owner",
		description: "Akun utama untuk mengelola usaha dan tim.",
	},
	{
		title: "Data usaha",
		description: "Nama usaha yang tampil di dashboard, invoice, dan struk.",
	},
	{
		title: "Cabang awal",
		description: "Cabang dan gudang pertama agar POS bisa langsung dipakai.",
	},
];

function FieldLabel({
	label,
	required = false,
}: {
	label: string;
	required?: boolean;
}) {
	return (
		<label className="block text-sm font-bold text-slate-700">
			{label} {required && <span className="text-rose-500">*</span>}
		</label>
	);
}

export default function Register() {
	const { data, setData, post, processing, errors, reset } = useForm({
		name: "",
		email: "",
		password: "",
		password_confirmation: "",
		business_name: "",
		business_slug: "",
		business_type: "retail",
		branch_name: "Cabang Utama",
		warehouse_name: "Gudang Utama",
	});

	const submit: FormEventHandler = (e) => {
		e.preventDefault();

		post(route("register"), {
			onFinish: () => reset("password", "password_confirmation"),
		});
	};

	return (
		<>
			<Head title="Daftar RangKayo" />

			<main className="min-h-screen overflow-hidden bg-white text-slate-950">
				<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,_rgba(34,211,238,0.16),_transparent_30%),radial-gradient(circle_at_90%_10%,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_48%,_#eef7fb_100%)]" />

				<section className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
					<aside className="flex flex-col justify-between rounded-[2.5rem] border border-white/80 bg-white/75 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl lg:p-8">
						<div>
							<Link href="/" className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg shadow-slate-300">
									R
								</div>
								<div>
									<p className="text-lg font-black tracking-tight text-slate-950">
										RangKayo
									</p>
									<p className="text-xs font-semibold text-slate-500">
										POS + Akuntansi UMKM
									</p>
								</div>
							</Link>

							<div className="mt-12">
								<span className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">
									Mulai trial usaha
								</span>
								<h1 className="mt-6 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
									Buat sistem usaha yang rapi dari hari pertama.
								</h1>
								<p className="mt-5 text-base leading-7 text-slate-600">
									Daftarkan usaha, cabang pertama, dan gudang awal. Setelah itu
									RangKayo langsung menyiapkan dashboard, POS, stok, dan
									pembukuan dasar untuk kamu.
								</p>
							</div>

							<div className="mt-8 space-y-3">
								{steps.map((step, index) => (
									<div
										key={step.title}
										className="flex gap-4 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/70"
									>
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
											{index + 1}
										</span>
										<div>
											<p className="font-black text-slate-950">{step.title}</p>
											<p className="mt-1 text-sm leading-6 text-slate-500">
												{step.description}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>

						<p className="mt-8 text-sm font-semibold text-slate-500">
							Sudah punya akun?{" "}
							<Link href={route("login")} className="font-black text-slate-950">
								Masuk di sini
							</Link>
						</p>
					</aside>

					<div className="flex items-center">
						<form
							onSubmit={submit}
							className="w-full rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl lg:p-8"
						>
							<div>
								<p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600">
									Daftar usaha
								</p>
								<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
									Isi data singkat. Sisanya bisa dilengkapi nanti.
								</h2>
							</div>

							<section className="mt-7 rounded-[2rem] border border-slate-100 bg-slate-50/70 p-5">
								<h3 className="text-base font-black text-slate-950">
									1. Akun owner
								</h3>
								<div className="mt-4 grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<FieldLabel label="Nama owner" required />
										<input
											className={inputClass}
											value={data.name}
											autoComplete="name"
											onChange={(e) => setData("name", e.target.value)}
											required
										/>
										<InputError message={errors.name} />
									</div>
									<div className="space-y-2">
										<FieldLabel label="Email aktif" required />
										<input
											className={inputClass}
											type="email"
											value={data.email}
											autoComplete="username"
											onChange={(e) => setData("email", e.target.value)}
											required
										/>
										<InputError message={errors.email} />
									</div>
									<div className="space-y-2">
										<FieldLabel label="Password" required />
										<input
											className={inputClass}
											type="password"
											value={data.password}
											autoComplete="new-password"
											onChange={(e) => setData("password", e.target.value)}
											required
										/>
										<InputError message={errors.password} />
									</div>
									<div className="space-y-2">
										<FieldLabel label="Ulangi password" required />
										<input
											className={inputClass}
											type="password"
											value={data.password_confirmation}
											autoComplete="new-password"
											onChange={(e) =>
												setData("password_confirmation", e.target.value)
											}
											required
										/>
										<InputError message={errors.password_confirmation} />
									</div>
								</div>
							</section>

							<section className="mt-5 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/70">
								<h3 className="text-base font-black text-slate-950">
									2. Data usaha
								</h3>
								<div className="mt-4 grid gap-4 md:grid-cols-2">
									<div className="space-y-2 md:col-span-2">
										<FieldLabel label="Nama usaha" required />
										<input
											className={inputClass}
											placeholder="Contoh: Rangkayo Mart"
											value={data.business_name}
											onChange={(e) => setData("business_name", e.target.value)}
											required
										/>
										<InputError message={errors.business_name} />
									</div>
									<div className="space-y-2">
										<FieldLabel label="Slug usaha" />
										<input
											className={inputClass}
											placeholder="Opsional, contoh: rangkayo-mart"
											value={data.business_slug}
											onChange={(e) => setData("business_slug", e.target.value)}
										/>
										<InputError message={errors.business_slug} />
									</div>
									<div className="space-y-2">
										<FieldLabel label="Jenis usaha" />
										<select
											className={inputClass}
											value={data.business_type}
											onChange={(e) => setData("business_type", e.target.value)}
										>
											<option value="retail">Retail / Toko</option>
											<option value="food-beverage">F&B / Kuliner</option>
											<option value="service">Jasa</option>
											<option value="distribution">Distribusi</option>
											<option value="other">Lainnya</option>
										</select>
									</div>
								</div>
							</section>

							<section className="mt-5 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/70">
								<h3 className="text-base font-black text-slate-950">
									3. Cabang awal
								</h3>
								<div className="mt-4 grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<FieldLabel label="Nama cabang pertama" required />
										<input
											className={inputClass}
											value={data.branch_name}
											onChange={(e) => setData("branch_name", e.target.value)}
											required
										/>
									</div>
									<div className="space-y-2">
										<FieldLabel label="Nama gudang default" required />
										<input
											className={inputClass}
											value={data.warehouse_name}
											onChange={(e) =>
												setData("warehouse_name", e.target.value)
											}
											required
										/>
									</div>
								</div>
							</section>

							<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm font-semibold text-slate-500">
									Dengan daftar, kamu membuat workspace usaha baru sebagai
									owner.
								</p>
								<button
									disabled={processing}
									className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
								>
									Daftar & buat usaha
								</button>
							</div>
						</form>
					</div>
				</section>
			</main>
		</>
	);
}
