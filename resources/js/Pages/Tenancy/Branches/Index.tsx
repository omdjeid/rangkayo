import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

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

const secondaryButtonClass =
	"rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-950";

function StatusBadge({ active }: { active: boolean }) {
	return (
		<span
			className={`rounded-full px-3 py-1 text-xs font-bold ${
				active
					? "bg-emerald-50 text-emerald-700"
					: "bg-slate-100 text-slate-500"
			}`}
		>
			{active ? "Aktif" : "Nonaktif"}
		</span>
	);
}

export default function BranchesIndex({
	branches,
}: PageProps<{ branches: Branch[] }>) {
	const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
	const [editingWarehouseId, setEditingWarehouseId] = useState<number | null>(
		null,
	);
	const activeBranches = useMemo(
		() => branches.filter((branch) => branch.is_active),
		[branches],
	);
	const branchForm = useForm({ name: "", code: "", phone: "", address: "" });
	const branchEditForm = useForm({
		name: "",
		code: "",
		phone: "",
		address: "",
	});
	const branchStatusForm = useForm({ is_active: true });
	const warehouseForm = useForm({
		branch_id:
			activeBranches[0]?.id?.toString() ?? branches[0]?.id?.toString() ?? "",
		name: "",
		code: "",
		is_default: false,
	});
	const warehouseEditForm = useForm({
		branch_id: "",
		name: "",
		code: "",
		is_default: false,
	});
	const warehouseStatusForm = useForm({ is_active: true });

	function startBranchEdit(branch: Branch) {
		setEditingBranchId(branch.id);
		branchEditForm.setData({
			name: branch.name,
			code: branch.code ?? "",
			phone: branch.phone ?? "",
			address: branch.address ?? "",
		});
	}

	function startWarehouseEdit(branch: Branch, warehouse: Warehouse) {
		setEditingWarehouseId(warehouse.id);
		warehouseEditForm.setData({
			branch_id: branch.id.toString(),
			name: warehouse.name,
			code: warehouse.code ?? "",
			is_default: warehouse.is_default,
		});
	}

	function toggleBranch(branch: Branch) {
		branchStatusForm.setData("is_active", !branch.is_active);
		branchStatusForm.patch(route("branches.status", branch.id), {
			preserveScroll: true,
		});
	}

	function toggleWarehouse(warehouse: Warehouse) {
		warehouseStatusForm.setData("is_active", !warehouse.is_active);
		warehouseStatusForm.patch(route("warehouses.status", warehouse.id), {
			preserveScroll: true,
		});
	}

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
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tambah Cabang
							</h3>
							<p className="mt-1 text-sm text-slate-500">
								Buat outlet/lokasi operasional baru. Cabang bisa diedit atau
								dinonaktifkan kapan saja.
							</p>
							<div className="mt-4 space-y-3">
								<FormField
									label="Nama cabang"
									required
									error={branchForm.errors.name}
								>
									<input
										className={inputClass}
										value={branchForm.data.name}
										onChange={(e) => branchForm.setData("name", e.target.value)}
									/>
								</FormField>
								<FormField label="Kode" error={branchForm.errors.code}>
									<input
										className={inputClass}
										value={branchForm.data.code}
										onChange={(e) => branchForm.setData("code", e.target.value)}
									/>
								</FormField>
								<FormField label="Telepon" error={branchForm.errors.phone}>
									<input
										className={inputClass}
										value={branchForm.data.phone}
										onChange={(e) =>
											branchForm.setData("phone", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Alamat" error={branchForm.errors.address}>
									<textarea
										className={inputClass}
										rows={3}
										value={branchForm.data.address}
										onChange={(e) =>
											branchForm.setData("address", e.target.value)
										}
									/>
								</FormField>
								<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60">
									Simpan Cabang
								</button>
							</div>
						</form>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								warehouseForm.post(route("warehouses.store"), {
									preserveScroll: true,
									onSuccess: () =>
										warehouseForm.reset("name", "code", "is_default"),
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Tambah Gudang
							</h3>
							<p className="mt-1 text-sm text-slate-500">
								Gudang bisa dibuat per cabang, lalu dipakai untuk stok masuk,
								transfer stok, POS, dan laporan stok.
							</p>
							<div className="mt-4 space-y-3">
								<FormField
									label="Cabang"
									required
									error={warehouseForm.errors.branch_id}
								>
									<select
										className={inputClass}
										value={warehouseForm.data.branch_id}
										onChange={(e) =>
											warehouseForm.setData("branch_id", e.target.value)
										}
									>
										{activeBranches.map((branch) => (
											<option key={branch.id} value={branch.id}>
												{branch.name}
											</option>
										))}
									</select>
								</FormField>
								<FormField
									label="Nama gudang"
									required
									error={warehouseForm.errors.name}
								>
									<input
										className={inputClass}
										value={warehouseForm.data.name}
										onChange={(e) =>
											warehouseForm.setData("name", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Kode" error={warehouseForm.errors.code}>
									<input
										className={inputClass}
										value={warehouseForm.data.code}
										onChange={(e) =>
											warehouseForm.setData("code", e.target.value)
										}
									/>
								</FormField>
								<label className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
									<input
										type="checkbox"
										checked={warehouseForm.data.is_default}
										onChange={(e) =>
											warehouseForm.setData("is_default", e.target.checked)
										}
										className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
									/>
									Jadikan gudang default cabang
								</label>
								<button className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-100 disabled:opacity-60">
									Simpan Gudang
								</button>
							</div>
						</form>
					</div>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h3 className="text-lg font-semibold text-slate-950">
									Daftar Cabang
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									{branches.length} cabang ·{" "}
									{branches.reduce(
										(total, branch) => total + branch.warehouses.length,
										0,
									)}{" "}
									gudang
								</p>
							</div>
							<div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-300">
								Multi cabang aktif
							</div>
						</div>
						<div className="mt-5 space-y-4">
							{branches.map((branch) => (
								<div
									key={branch.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold text-slate-950">
													{branch.name}
												</p>
												<StatusBadge active={branch.is_active} />
											</div>
											<p className="mt-1 text-sm text-slate-500">
												{branch.code ?? "Tanpa kode"} ·{" "}
												{branch.phone ?? "Tanpa telepon"}
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{branch.address ?? "Alamat belum diisi"}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => startBranchEdit(branch)}
												className={secondaryButtonClass}
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => toggleBranch(branch)}
												className={secondaryButtonClass}
											>
												{branch.is_active ? "Nonaktifkan" : "Aktifkan"}
											</button>
										</div>
									</div>

									{editingBranchId === branch.id && (
										<form
											onSubmit={(e) => {
												e.preventDefault();
												branchEditForm.patch(
													route("branches.update", branch.id),
													{
														preserveScroll: true,
														onSuccess: () => setEditingBranchId(null),
													},
												);
											}}
											className="mt-4 grid gap-3 rounded-3xl bg-slate-50/90 p-4 md:grid-cols-2"
										>
											<FormField
												label="Nama cabang"
												required
												error={branchEditForm.errors.name}
											>
												<input
													className={inputClass}
													value={branchEditForm.data.name}
													onChange={(e) =>
														branchEditForm.setData("name", e.target.value)
													}
												/>
											</FormField>
											<FormField
												label="Kode"
												error={branchEditForm.errors.code}
											>
												<input
													className={inputClass}
													value={branchEditForm.data.code}
													onChange={(e) =>
														branchEditForm.setData("code", e.target.value)
													}
												/>
											</FormField>
											<FormField
												label="Telepon"
												error={branchEditForm.errors.phone}
											>
												<input
													className={inputClass}
													value={branchEditForm.data.phone}
													onChange={(e) =>
														branchEditForm.setData("phone", e.target.value)
													}
												/>
											</FormField>
											<FormField
												label="Alamat"
												error={branchEditForm.errors.address}
											>
												<textarea
													className={inputClass}
													value={branchEditForm.data.address}
													onChange={(e) =>
														branchEditForm.setData("address", e.target.value)
													}
												/>
											</FormField>
											<div className="flex gap-2 md:col-span-2">
												<button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
													Simpan Perubahan Cabang
												</button>
												<button
													type="button"
													onClick={() => setEditingBranchId(null)}
													className={secondaryButtonClass}
												>
													Batal
												</button>
											</div>
										</form>
									)}

									<div className="mt-4 space-y-2">
										{branch.warehouses.map((warehouse) => (
											<div
												key={warehouse.id}
												className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4"
											>
												<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
													<div>
														<div className="flex flex-wrap items-center gap-2">
															<p className="font-semibold text-slate-800">
																{warehouse.name}
															</p>
															<StatusBadge active={warehouse.is_active} />
															{warehouse.is_default && (
																<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
																	Default
																</span>
															)}
														</div>
														<p className="mt-1 text-xs text-slate-500">
															{warehouse.code ?? "Tanpa kode"}
														</p>
													</div>
													<div className="flex flex-wrap gap-2">
														<button
															type="button"
															onClick={() =>
																startWarehouseEdit(branch, warehouse)
															}
															className={secondaryButtonClass}
														>
															Edit
														</button>
														<button
															type="button"
															onClick={() => toggleWarehouse(warehouse)}
															className={secondaryButtonClass}
														>
															{warehouse.is_active ? "Nonaktifkan" : "Aktifkan"}
														</button>
													</div>
												</div>

												{editingWarehouseId === warehouse.id && (
													<form
														onSubmit={(e) => {
															e.preventDefault();
															warehouseEditForm.patch(
																route("warehouses.update", warehouse.id),
																{
																	preserveScroll: true,
																	onSuccess: () => setEditingWarehouseId(null),
																},
															);
														}}
														className="mt-4 grid gap-3 rounded-3xl bg-white/80 p-4 md:grid-cols-2"
													>
														<FormField
															label="Cabang"
															required
															error={warehouseEditForm.errors.branch_id}
														>
															<select
																className={inputClass}
																value={warehouseEditForm.data.branch_id}
																onChange={(e) =>
																	warehouseEditForm.setData(
																		"branch_id",
																		e.target.value,
																	)
																}
															>
																{activeBranches.map((branchOption) => (
																	<option
																		key={branchOption.id}
																		value={branchOption.id}
																	>
																		{branchOption.name}
																	</option>
																))}
															</select>
														</FormField>
														<FormField
															label="Nama gudang"
															required
															error={warehouseEditForm.errors.name}
														>
															<input
																className={inputClass}
																value={warehouseEditForm.data.name}
																onChange={(e) =>
																	warehouseEditForm.setData(
																		"name",
																		e.target.value,
																	)
																}
															/>
														</FormField>
														<FormField
															label="Kode"
															error={warehouseEditForm.errors.code}
														>
															<input
																className={inputClass}
																value={warehouseEditForm.data.code}
																onChange={(e) =>
																	warehouseEditForm.setData(
																		"code",
																		e.target.value,
																	)
																}
															/>
														</FormField>
														<label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
															<input
																type="checkbox"
																checked={warehouseEditForm.data.is_default}
																onChange={(e) =>
																	warehouseEditForm.setData(
																		"is_default",
																		e.target.checked,
																	)
																}
																className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
															/>
															Jadikan default cabang
														</label>
														<div className="flex gap-2 md:col-span-2">
															<button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
																Simpan Perubahan Gudang
															</button>
															<button
																type="button"
																onClick={() => setEditingWarehouseId(null)}
																className={secondaryButtonClass}
															>
																Batal
															</button>
														</div>
													</form>
												)}
											</div>
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
