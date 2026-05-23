import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import type { PageProps } from "@/types";
import { Head, useForm } from "@inertiajs/react";
interface Invitation {
	token: string;
	name: string | null;
	email: string;
	tenant: string;
	role: string;
}
export default function AcceptInvitation({
	invitation,
}: PageProps<{ invitation: Invitation }>) {
	const form = useForm({ name: invitation.name ?? "", password: "" });
	return (
		<GuestLayout>
			<Head title="Terima Undangan" />
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.post(route("invitations.complete", invitation.token));
				}}
			>
				<div className="mb-6 rounded-3xl bg-white/70 p-4">
					<p className="font-bold text-slate-950">
						Undangan {invitation.tenant}
					</p>
					<p className="text-sm text-slate-500">
						{invitation.email} · {invitation.role}
					</p>
				</div>
				<div>
					<InputLabel value="Nama" />
					<TextInput
						className="mt-1 block w-full"
						value={form.data.name}
						onChange={(e) => form.setData("name", e.target.value)}
						required
					/>
				</div>
				<div className="mt-4">
					<InputLabel value="Password" />
					<TextInput
						className="mt-1 block w-full"
						type="password"
						value={form.data.password}
						onChange={(e) => form.setData("password", e.target.value)}
						required
					/>
				</div>
				<div className="mt-6 flex justify-end">
					<PrimaryButton disabled={form.processing}>
						Terima Undangan
					</PrimaryButton>
				</div>
			</form>
		</GuestLayout>
	);
}
