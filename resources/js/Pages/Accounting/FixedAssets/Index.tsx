import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { BranchOption, PageProps } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, router, useForm } from "@inertiajs/react";

interface FixedAsset {
	id: number;
	asset_number: string;
	name: string;
	branch: string | null;
	acquired_at: string;
	depreciation_started_at: string;
	acquisition_cost: number;
	salvage_value: number;
	useful_life_months: number;
	monthly_depreciation: number;
	accumulated_depreciation: number;
	book_value: number;
	last_depreciated_at: string | null;
	status: string;
	notes: string | null;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function FixedAssetsIndex({
	branches,
	assets,
}: PageProps<{
	branches: BranchOption[];
	assets: FixedAsset[];
}>) {
	const form = useForm({
		branch_id: branches[0]?.id?.toString() ?? "",
		name: "",
		acquired_at: new Date().toISOString().slice(0, 10),
		depreciation_started_at: new Date().toISOString().slice(0, 10),
		acquisition_cost: "0",
		salvage_value: "0",
		useful_life_months: "48",
		notes: "",
	});
	const depreciationDate = new Date().toISOString().slice(0, 10);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		form.post(route("fixed-assets.store"), {
			preserveScroll: true,
			onSuccess: () => form.reset("name", "acquisition_cost", "notes"),
		});
	}

	function postDepreciation(asset: FixedAsset) {
		router.post(
			route("fixed-assets.depreciate", asset.id),
			{ depreciation_date: depreciationDate },
			{ preserveScroll: true },
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Aset Tetap
					</h2>
				</div>
			}
		>
			<Head title="Aset Tetap" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<h3 className="text-lg font-semibold text-slate-950">
							Tambah Aset Tetap
						</h3>
						<div className="mt-5 space-y-4">
							<FormField label="Cabang">
								<select
									className={inputClass}
									value={form.data.branch_id}
									onChange={(e) => form.setData("branch_id", e.target.value)}
								>
									<option value="">Konsolidasi / kantor pusat</option>
									{branches.map((branch) => (
										<option key={branch.id} value={branch.id}>
											{branch.name}
										</option>
									))}
								</select>
							</FormField>
							<FormField label="Nama aset" required error={form.errors.name}>
								<input
									className={inputClass}
									value={form.data.name}
									onChange={(e) => form.setData("name", e.target.value)}
									placeholder="Contoh: Etalase toko"
								/>
							</FormField>
							<div className="grid gap-3 md:grid-cols-2">
								<FormField label="Tanggal perolehan" required>
									<input
										className={inputClass}
										type="date"
										value={form.data.acquired_at}
										onChange={(e) =>
											form.setData("acquired_at", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Mulai penyusutan" required>
									<input
										className={inputClass}
										type="date"
										value={form.data.depreciation_started_at}
										onChange={(e) =>
											form.setData("depreciation_started_at", e.target.value)
										}
									/>
								</FormField>
							</div>
							<div className="grid gap-3 md:grid-cols-3">
								<FormField label="Nilai perolehan" required>
									<input
										className={inputClass}
										type="number"
										min="0"
										value={form.data.acquisition_cost}
										onChange={(e) =>
											form.setData("acquisition_cost", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Nilai residu">
									<input
										className={inputClass}
										type="number"
										min="0"
										value={form.data.salvage_value}
										onChange={(e) =>
											form.setData("salvage_value", e.target.value)
										}
									/>
								</FormField>
								<FormField label="Umur manfaat (bulan)" required>
									<input
										className={inputClass}
										type="number"
										min="1"
										value={form.data.useful_life_months}
										onChange={(e) =>
											form.setData("useful_life_months", e.target.value)
										}
									/>
								</FormField>
							</div>
							<FormField label="Catatan">
								<textarea
									className={inputClass}
									value={form.data.notes}
									onChange={(e) => form.setData("notes", e.target.value)}
								/>
							</FormField>
							<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
								Simpan Aset
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Aset Tetap
						</h3>
						<div className="mt-5 space-y-3">
							{assets.map((asset) => (
								<div
									key={asset.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
										<div>
											<p className="font-semibold text-slate-950">
												{asset.name}
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{asset.asset_number} · {asset.branch ?? "Konsolidasi"} ·{" "}
												{asset.status}
											</p>
											<p className="mt-2 text-sm text-slate-600">
												Beban bulanan{" "}
												{formatCurrency(asset.monthly_depreciation)} · Akumulasi{" "}
												{formatCurrency(asset.accumulated_depreciation)}
											</p>
										</div>
										<div className="text-left md:text-right">
											<p className="font-bold text-slate-950">
												{formatCurrency(asset.book_value)}
											</p>
											<p className="text-xs text-slate-500">Nilai buku</p>
											{asset.status === "active" && (
												<button
													type="button"
													onClick={() => postDepreciation(asset)}
													className="mt-3 rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-200"
												>
													Posting Penyusutan
												</button>
											)}
										</div>
									</div>
								</div>
							))}
							{assets.length === 0 && (
								<p className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-500">
									Belum ada aset tetap.
								</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
