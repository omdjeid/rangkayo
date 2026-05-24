import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { Head, router, useForm } from "@inertiajs/react";

interface TenantUser {
	id: number;
	name: string;
	email: string;
	role: string;
	branch_id: number | null;
	branch_ids: number[];
	branch: string | null;
	branches: string[];
	is_active: boolean;
}
interface Branch {
	id: number;
	name: string;
	code: string | null;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function branchSummary(user: TenantUser) {
	if (user.branch_ids.length === 0) return "Semua cabang";

	return user.branches.join(", ");
}

export default function TenantUsersIndex({
	users,
	branches,
	roles,
	tenant,
}: PageProps<{
	tenant: { name: string };
	users: TenantUser[];
	branches: Branch[];
	roles: string[];
}>) {
	const form = useForm({
		name: "",
		email: "",
		password: "",
		role: "cashier",
		branch_id: branches[0]?.id?.toString() ?? "",
		branch_ids: branches[0]?.id
			? [branches[0].id.toString()]
			: ([] as string[]),
	});
	const invitationForm = useForm({
		name: "",
		email: "",
		role: "cashier",
		branch_id: branches[0]?.id?.toString() ?? "",
	});

	function toggleFormBranch(branchId: string) {
		const nextBranchIds = form.data.branch_ids.includes(branchId)
			? form.data.branch_ids.filter((id) => id !== branchId)
			: [...form.data.branch_ids, branchId];

		form.setData((data) => ({
			...data,
			branch_id: nextBranchIds[0] ?? "",
			branch_ids: nextBranchIds,
		}));
	}

	function updateUserStatus(user: TenantUser, isActive: boolean) {
		const branchIds = user.branch_ids.map((id) => id.toString());

		router.patch(
			route("tenant-users.update", user.id),
			{
				role: user.role,
				branch_id: branchIds[0] ?? "",
				branch_ids: branchIds,
				is_active: isActive,
			},
			{ preserveScroll: true },
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">{tenant.name}</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						User & Akses
					</h2>
				</div>
			}
		>
			<Head title="User & Akses" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							form.post(route("tenant-users.store"), {
								preserveScroll: true,
								onSuccess: () => form.reset("name", "email", "password"),
							});
						}}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<h3 className="text-lg font-semibold text-slate-950">
							Tambah User
						</h3>
						<div className="mt-5 space-y-4">
							<FormField label="Nama" required>
								<input
									className={inputClass}
									value={form.data.name}
									onChange={(event) => form.setData("name", event.target.value)}
								/>
							</FormField>
							<FormField label="Email" required>
								<input
									className={inputClass}
									type="email"
									value={form.data.email}
									onChange={(event) =>
										form.setData("email", event.target.value)
									}
								/>
							</FormField>
							<FormField
								label="Password awal"
								hint="Kosongkan untuk memakai password default sementara dari server."
							>
								<input
									className={inputClass}
									value={form.data.password}
									onChange={(event) =>
										form.setData("password", event.target.value)
									}
								/>
							</FormField>
							<FormField label="Role" required>
								<select
									className={inputClass}
									value={form.data.role}
									onChange={(event) => form.setData("role", event.target.value)}
								>
									{roles.map((role) => (
										<option key={role} value={role}>
											{role}
										</option>
									))}
								</select>
							</FormField>
							<FormField
								label="Akses Cabang"
								hint="Centang beberapa cabang untuk manager/staf yang menangani lebih dari satu outlet. Owner/admin/akuntan tetap bisa melihat semua cabang."
								error={form.errors.branch_ids}
							>
								<div className="grid gap-2">
									{branches.map((branch) => {
										const id = branch.id.toString();

										return (
											<label
												key={branch.id}
												className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm"
											>
												<span>
													{branch.name}
													{branch.code ? ` · ${branch.code}` : ""}
												</span>
												<input
													type="checkbox"
													className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
													checked={form.data.branch_ids.includes(id)}
													onChange={() => toggleFormBranch(id)}
												/>
											</label>
										);
									})}
								</div>
							</FormField>
							<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
								Simpan User
							</button>
						</div>
					</form>

					<div className="space-y-6">
						<form
							onSubmit={(event) => {
								event.preventDefault();
								invitationForm.post(route("tenant-invitations.store"), {
									preserveScroll: true,
									onSuccess: () => invitationForm.reset("name", "email"),
								});
							}}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Buat Undangan
							</h3>
							<div className="mt-5 grid gap-3 md:grid-cols-2">
								<input
									className={inputClass}
									placeholder="Nama"
									value={invitationForm.data.name}
									onChange={(event) =>
										invitationForm.setData("name", event.target.value)
									}
								/>
								<input
									className={inputClass}
									placeholder="Email"
									type="email"
									value={invitationForm.data.email}
									onChange={(event) =>
										invitationForm.setData("email", event.target.value)
									}
								/>
								<select
									className={inputClass}
									value={invitationForm.data.role}
									onChange={(event) =>
										invitationForm.setData("role", event.target.value)
									}
								>
									{roles
										.filter((role) => role !== "owner")
										.map((role) => (
											<option key={role} value={role}>
												{role}
											</option>
										))}
								</select>
								<select
									className={inputClass}
									value={invitationForm.data.branch_id}
									onChange={(event) =>
										invitationForm.setData("branch_id", event.target.value)
									}
								>
									<option value="">Semua cabang</option>
									{branches.map((branch) => (
										<option key={branch.id} value={branch.id}>
											{branch.name}
										</option>
									))}
								</select>
							</div>
							<button className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200">
								Buat Undangan
							</button>
						</form>

						<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<h3 className="text-lg font-semibold text-slate-950">
								Daftar User
							</h3>
							<div className="mt-5 space-y-3">
								{users.map((user) => (
									<div
										key={user.id}
										className="rounded-3xl border border-slate-200 bg-white/75 p-5"
									>
										<div className="flex justify-between gap-4">
											<div>
												<p className="font-semibold text-slate-950">
													{user.name}
												</p>
												<p className="text-sm text-slate-500">
													{user.email} · {user.role} · {branchSummary(user)}
												</p>
											</div>
											<button
												type="button"
												onClick={() => updateUserStatus(user, !user.is_active)}
												className={`rounded-full px-3 py-1 text-xs font-bold ${
													user.is_active
														? "bg-emerald-100 text-emerald-700"
														: "bg-slate-100 text-slate-500"
												}`}
											>
												{user.is_active ? "Aktif" : "Nonaktif"}
											</button>
										</div>
									</div>
								))}
							</div>
						</section>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
