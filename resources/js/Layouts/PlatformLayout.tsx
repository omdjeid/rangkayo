import ApplicationLogo from "@/Components/ApplicationLogo";
import Dropdown from "@/Components/Dropdown";
import type { PageProps } from "@/types";
import { Link, usePage } from "@inertiajs/react";
import type { PropsWithChildren, ReactNode } from "react";

type PlatformItem = {
	name: string;
	href: string;
};

const platformItems: PlatformItem[] = [
	{ name: "Tenant SaaS", href: "platform.tenants.index" },
];

function PlatformLink({ item }: { item: PlatformItem }) {
	const active = route().current(item.href);

	return (
		<Link
			href={route(item.href)}
			className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
				active
					? "bg-slate-950 text-white shadow-lg shadow-slate-300"
					: "text-slate-600 hover:bg-white/80 hover:text-slate-950"
			}`}
		>
			<span>{item.name}</span>
			{active && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
		</Link>
	);
}

export default function PlatformLayout({
	header,
	children,
}: PropsWithChildren<{ header?: ReactNode }>) {
	const { user } = usePage<PageProps>().props.auth;

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(8,47,73,0.16),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#e0f2fe_100%)]">
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/70 bg-white/75 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl lg:block">
				<div className="flex h-full flex-col">
					<div className="px-5 py-5">
						<Link
							href={route("platform.tenants.index")}
							className="flex items-center gap-3"
						>
							<ApplicationLogo className="h-11 w-11 text-slate-950 drop-shadow-xl" />
							<div>
								<p className="text-base font-bold tracking-tight text-slate-950">
									Akutansia Platform
								</p>
								<p className="text-xs font-medium text-slate-500">
									Super Admin Console
								</p>
							</div>
						</Link>

						<div className="mt-5 rounded-3xl border border-white/80 bg-slate-950 p-4 text-white shadow-sm">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
								Platform Area
							</p>
							<p className="mt-2 text-sm font-semibold text-white">
								Kelola tenant, paket, dan status SaaS.
							</p>
						</div>
					</div>

					<div className="flex-1 space-y-2 px-4">
						{platformItems.map((item) => (
							<PlatformLink key={item.href} item={item} />
						))}
					</div>

					<div className="border-t border-slate-200 p-4">
						<Link
							href={route("dashboard")}
							className="block rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-950"
						>
							Kembali ke App Tenant
						</Link>
					</div>
				</div>
			</aside>

			<div className="lg:pl-72">
				<nav className="sticky top-0 z-20 border-b border-white/70 bg-white/75 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
					<div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
						<div>
							<p className="text-sm font-semibold text-slate-500">
								Platform Console
							</p>
						</div>

						<Dropdown>
							<Dropdown.Trigger>
								<button className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950">
									{user.name}
								</button>
							</Dropdown.Trigger>
							<Dropdown.Content>
								<Dropdown.Link href={route("dashboard")}>
									App Tenant
								</Dropdown.Link>
								<Dropdown.Link href={route("logout")} method="post" as="button">
									Keluar
								</Dropdown.Link>
							</Dropdown.Content>
						</Dropdown>
					</div>
				</nav>

				{header && (
					<header className="border-b border-white/70 bg-white/50 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
						<div className="px-4 py-6 sm:px-6 lg:px-8">{header}</div>
					</header>
				)}

				<main>{children}</main>
			</div>
		</div>
	);
}
