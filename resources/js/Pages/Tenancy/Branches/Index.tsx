import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";
interface Warehouse {
	id: number;
	name: string;
	code: string | null;
	is_default: boolean;
	is_active: boolean;
}
interface Branch {
	id: number;
	name: string;
	code: string | null;
	phone: string | null;
	address: string | null;
	is_active: boolean;
	warehouses: Warehouse[];
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";
export default function BranchesIndex({
	branches,
}: PageProps<{ branches: Branch[] }>) {
	const branchForm = useForm({ name: "", code: "", phone: "", address: "" });
	const warehouseForm = useForm({
		branch_id: branches[0]?.id?.toString() ?? "",
		name: "",
		code: "",
		is_default: false,
	});
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Operasional</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Cabang & Gudang
					</h2>
				</div>
			}
		>
			<Head title="Cabang & Gudang" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.3fr] lg:px-8">
					<div className="space-y-6">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								branchForm.post(route("branches.store"), {
									preserveScroll: true,
									onSuccess: () => branchForm.reset(),
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tambah Cabang
							</h3>
							<div className="mt-4 space-y-3">
								<FormField label="Nama" required>
									<input
										className={inputClass}
										value={branchForm.data.name}
										onChange={(e) => branchForm.setData("name", e.target.value)}
									/>
								</FormField>
								<FormField label="Kode">
									<input
										className={inputClass}
										value={branchForm.data.code}
										onChange={(e) => branchForm.setData("code", e.target.value)}
									/>
								</FormField>
								<FormField label="Telepon">
									<input
										className={inputClass}
										value={branchForm.data.phone}
										onChange={(e) =>
											branchForm.setData("phone", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Alamat">
									<textarea
										className={inputClass}
										value={branchForm.data.address}
										onChange={(e) =>
											branchForm.setData("address", e.target.value)
										}
									/>
								</FormField>
								<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white">
									Simpan Cabang
								</button>
							</div>
						</form>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								warehouseForm.post(route("warehouses.store"), {
									preserveScroll: true,
									onSuccess: () => warehouseForm.reset("name", "code"),
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tambah Gudang
							</h3>
							<div className="mt-4 space-y-3">
								<FormField label="Cabang" required>
									<select
										className={inputClass}
										value={warehouseForm.data.branch_id}
										onChange={(e) =>
											warehouseForm.setData("branch_id", e.target.value)
										}
									>
										{branches.map((branch) => (
											<option key={branch.id} value={branch.id}>
												{branch.name}
											</option>
										))}
									</select>
								</FormField>
								<FormField label="Nama" required>
									<input
										className={inputClass}
										value={warehouseForm.data.name}
										onChange={(e) =>
											warehouseForm.setData("name", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Kode">
									<input
										className={inputClass}
										value={warehouseForm.data.code}
										onChange={(e) =>
											warehouseForm.setData("code", e.target.value)
										}
									/>
								</FormField>
								<button className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">
									Simpan Gudang
								</button>
							</div>
						</form>
					</div>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Cabang
						</h3>
						<div className="mt-5 space-y-3">
							{branches.map((branch) => (
								<div
									key={branch.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<p className="font-semibold text-slate-950">{branch.name}</p>
									<p className="text-sm text-slate-500">
										{branch.code ?? "-"} · {branch.address ?? "-"}
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										{branch.warehouses.map((warehouse) => (
											<span
												key={warehouse.id}
												className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
											>
												{warehouse.name}
												{warehouse.is_default ? " · Default" : ""}
											</span>
										))}
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
