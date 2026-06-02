import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";

interface Contact {
	id: number;
	type: string;
	name: string;
	email: string | null;
	phone: string | null;
	price_level: string;
	address: string | null;
	is_active: boolean;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function ContactsIndex({
	contacts,
}: PageProps<{ contacts: Contact[] }>) {
	const form = useForm({
		type: "customer",
		name: "",
		email: "",
		phone: "",
		price_level: "retail",
		address: "",
	});
	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("contacts.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset("name", "email", "phone", "price_level", "address"),
		});
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Kontak
					</h2>
				</div>
			}
		>
			<Head title="Kontak" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<h3 className="text-lg font-semibold text-slate-950">
							Tambah Kontak
						</h3>
						<div className="mt-5 space-y-4">
							<FormField label="Tipe" required>
								<select
									className={inputClass}
									value={form.data.type}
									onChange={(e) => form.setData("type", e.target.value)}
								>
									<option value="customer">Customer</option>
									<option value="supplier">Supplier</option>
									<option value="both">Customer & Supplier</option>
								</select>
							</FormField>
							<FormField label="Nama" required error={form.errors.name}>
								<input
									className={inputClass}
									value={form.data.name}
									onChange={(e) => form.setData("name", e.target.value)}
								/>
							</FormField>
							<FormField label="Email" error={form.errors.email}>
								<input
									className={inputClass}
									value={form.data.email}
									onChange={(e) => form.setData("email", e.target.value)}
								/>
							</FormField>
							<FormField label="Telepon" error={form.errors.phone}>
								<input
									className={inputClass}
									value={form.data.phone}
									onChange={(e) => form.setData("phone", e.target.value)}
								/>
							</FormField>
							<FormField label="Level Harga" hint="Retail = harga normal, Grosir = harga grosir.">
								<select
									className={inputClass}
									value={form.data.price_level}
									onChange={(e) => form.setData("price_level", e.target.value)}
								>
									<option value="retail">Retail</option>
									<option value="grosir">Grosir</option>
								</select>
							</FormField>
							<FormField label="Alamat" error={form.errors.address}>
								<textarea
									className={inputClass}
									rows={3}
									value={form.data.address}
									onChange={(e) => form.setData("address", e.target.value)}
								/>
							</FormField>
							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Simpan Kontak
							</button>
						</div>
					</form>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Kontak
						</h3>
						<div className="mt-5 space-y-3">
							{contacts.map((contact) => (
								<div
									key={contact.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex justify-between gap-4">
										<div>
											<p className="font-semibold text-slate-950">
												{contact.name}
											</p>
											<p className="text-sm text-slate-500">
												{contact.type} · {contact.phone ?? "-"} ·{" "}
												{contact.email ?? "-"}
											</p>
										</div>
										<div className="flex gap-1">
											<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
												{contact.type}
											</span>
											{contact.price_level === "grosir" && (
												<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
													Grosir
												</span>
											)}
										</div>
									</div>
									{contact.address && (
										<p className="mt-3 text-sm text-slate-600">
											{contact.address}
										</p>
									)}
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
