import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEventHandler } from "react";

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
		<GuestLayout>
			<Head title="Daftar" />

			<form onSubmit={submit}>
				<div>
					<InputLabel htmlFor="name" value="Nama Owner" />
					<TextInput
						id="name"
						name="name"
						value={data.name}
						className="mt-1 block w-full"
						autoComplete="name"
						isFocused={true}
						onChange={(e) => setData("name", e.target.value)}
						required
					/>
					<InputError message={errors.name} className="mt-2" />
				</div>

				<div className="mt-4">
					<InputLabel htmlFor="email" value="Email" />
					<TextInput
						id="email"
						type="email"
						name="email"
						value={data.email}
						className="mt-1 block w-full"
						autoComplete="username"
						onChange={(e) => setData("email", e.target.value)}
						required
					/>
					<InputError message={errors.email} className="mt-2" />
				</div>

				<div className="mt-4 grid gap-4 md:grid-cols-2">
					<div>
						<InputLabel htmlFor="password" value="Password" />
						<TextInput
							id="password"
							type="password"
							name="password"
							value={data.password}
							className="mt-1 block w-full"
							autoComplete="new-password"
							onChange={(e) => setData("password", e.target.value)}
							required
						/>
						<InputError message={errors.password} className="mt-2" />
					</div>
					<div>
						<InputLabel
							htmlFor="password_confirmation"
							value="Konfirmasi Password"
						/>
						<TextInput
							id="password_confirmation"
							type="password"
							name="password_confirmation"
							value={data.password_confirmation}
							className="mt-1 block w-full"
							autoComplete="new-password"
							onChange={(e) => setData("password_confirmation", e.target.value)}
							required
						/>
						<InputError
							message={errors.password_confirmation}
							className="mt-2"
						/>
					</div>
				</div>

				<div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-4">
					<p className="text-sm font-bold text-slate-950">Data Usaha</p>
					<div className="mt-4 space-y-4">
						<div>
							<InputLabel htmlFor="business_name" value="Nama Usaha" />
							<TextInput
								id="business_name"
								value={data.business_name}
								className="mt-1 block w-full"
								onChange={(e) => setData("business_name", e.target.value)}
								required
							/>
							<InputError message={errors.business_name} className="mt-2" />
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<InputLabel htmlFor="business_slug" value="Slug Usaha" />
								<TextInput
									id="business_slug"
									value={data.business_slug}
									className="mt-1 block w-full"
									onChange={(e) => setData("business_slug", e.target.value)}
								/>
								<InputError message={errors.business_slug} className="mt-2" />
							</div>
							<div>
								<InputLabel htmlFor="business_type" value="Tipe Bisnis" />
								<TextInput
									id="business_type"
									value={data.business_type}
									className="mt-1 block w-full"
									onChange={(e) => setData("business_type", e.target.value)}
								/>
							</div>
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<InputLabel htmlFor="branch_name" value="Cabang Pertama" />
								<TextInput
									id="branch_name"
									value={data.branch_name}
									className="mt-1 block w-full"
									onChange={(e) => setData("branch_name", e.target.value)}
									required
								/>
							</div>
							<div>
								<InputLabel htmlFor="warehouse_name" value="Gudang Default" />
								<TextInput
									id="warehouse_name"
									value={data.warehouse_name}
									className="mt-1 block w-full"
									onChange={(e) => setData("warehouse_name", e.target.value)}
									required
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-4 flex items-center justify-end">
					<Link
						href={route("login")}
						className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					>
						Sudah punya akun?
					</Link>
					<PrimaryButton className="ms-4" disabled={processing}>
						Daftar & Buat Usaha
					</PrimaryButton>
				</div>
			</form>
		</GuestLayout>
	);
}
