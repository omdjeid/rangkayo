import ApplicationLogo from "@/Components/ApplicationLogo";
import Dropdown from "@/Components/Dropdown";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import type {
	BranchOption,
	PageProps,
	Workspace,
	WorkspaceOption,
} from "@/types";
import { Link, usePage } from "@inertiajs/react";
import {
	type PropsWithChildren,
	type ReactNode,
	useMemo,
	useState,
} from "react";

type NavigationRole =
	| "owner"
	| "admin"
	| "accountant"
	| "branch_manager"
	| "cashier"
	| "warehouse_staff";

type NavigationItem = {
	name: string;
	href: string;
	roles: NavigationRole[];
};

type NavigationGroup = {
	title: string;
	items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
	{
		title: "Utama",
		items: [
			{
				name: "Dashboard",
				href: "dashboard",
				roles: [
					"owner",
					"admin",
					"accountant",
					"branch_manager",
					"warehouse_staff",
				],
			},
		],
	},
	{
		title: "Operasional",
		items: [
			{
				name: "POS",
				href: "pos.index",
				roles: ["owner", "admin", "branch_manager", "cashier"],
			},
			{
				name: "Produk",
				href: "products.index",
				roles: ["owner", "admin", "branch_manager", "warehouse_staff"],
			},
			{
				name: "Stok Masuk",
				href: "stock-in.index",
				roles: ["owner", "admin", "branch_manager", "warehouse_staff"],
			},
			{
				name: "Penyesuaian Stok",
				href: "stock-adjustments.index",
				roles: ["owner", "admin", "branch_manager", "warehouse_staff"],
			},
			{
				name: "Transfer Stok",
				href: "stock-transfers.index",
				roles: ["owner", "admin", "branch_manager", "warehouse_staff"],
			},
		],
	},
	{
		title: "Penjualan & Pembelian",
		items: [
			{
				name: "Kontak",
				href: "contacts.index",
				roles: ["owner", "admin", "accountant", "branch_manager"],
			},
			{
				name: "Invoice",
				href: "invoices.index",
				roles: ["owner", "admin", "accountant", "branch_manager"],
			},
			{
				name: "Shift Kasir",
				href: "cashier-shifts.index",
				roles: ["owner", "admin", "branch_manager", "cashier"],
			},
		],
	},
	{
		title: "Kas & Bank",
		items: [
			{
				name: "Transaksi Kas/Bank",
				href: "cash-transactions.index",
				roles: ["owner", "admin", "accountant"],
			},
		],
	},
	{
		title: "Akuntansi",
		items: [
			{
				name: "Daftar Akun",
				href: "accounts.index",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Jurnal Manual",
				href: "manual-journal.create",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Jurnal",
				href: "journal-entries.index",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Periode Akuntansi",
				href: "accounting-periods.index",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Audit Log",
				href: "audit-logs.index",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Buku Besar",
				href: "reports.ledger",
				roles: ["owner", "admin", "accountant"],
			},
		],
	},
	{
		title: "Laporan",
		items: [
			{
				name: "Neraca Saldo",
				href: "reports.trial-balance",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Laba Rugi",
				href: "reports.profit-loss",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Neraca",
				href: "reports.balance-sheet",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "Penjualan",
				href: "reports.sales",
				roles: ["owner", "admin", "accountant", "branch_manager"],
			},
			{
				name: "Stok",
				href: "reports.stock",
				roles: [
					"owner",
					"admin",
					"accountant",
					"branch_manager",
					"warehouse_staff",
				],
			},
			{
				name: "Perbandingan Cabang",
				href: "reports.branch-comparison",
				roles: ["owner", "admin", "accountant"],
			},
			{
				name: "User & Akses",
				href: "tenant-users.index",
				roles: ["owner", "admin"],
			},
			{
				name: "Cabang & Gudang",
				href: "branches-warehouses.index",
				roles: ["owner", "admin"],
			},
			{
				name: "Pengaturan Usaha",
				href: "tenant-settings.edit",
				roles: ["owner", "admin"],
			},
			{
				name: "Paket & Billing",
				href: "billing.index",
				roles: ["owner", "admin"],
			},
		],
	},
];

function roleLabel(role?: string) {
	const labels: Record<string, string> = {
		owner: "Owner",
		admin: "Admin",
		accountant: "Akuntan",
		branch_manager: "Manager Cabang",
		cashier: "Kasir",
		warehouse_staff: "Staf Gudang",
	};

	return labels[role ?? ""] ?? "User";
}

function SidebarLink({
	item,
	onClick,
}: {
	item: NavigationItem;
	onClick?: () => void;
}) {
	const active = route().current(item.href);

	return (
		<Link
			href={route(item.href)}
			onClick={onClick}
			className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
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

function SidebarGroup({
	group,
	onNavigate,
}: {
	group: NavigationGroup;
	onNavigate?: () => void;
}) {
	const defaultOpen = group.items.some((item) => route().current(item.href));
	const [isOpen, setIsOpen] = useState(defaultOpen || group.title === "Utama");
	const active = group.items.some((item) => route().current(item.href));

	return (
		<section>
			<button
				type="button"
				onClick={() => setIsOpen((value) => !value)}
				className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
					active
						? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
						: "text-slate-500 hover:bg-white/70 hover:text-slate-950"
				}`}
			>
				<span>{group.title}</span>
				<svg
					className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clipRule="evenodd"
					/>
				</svg>
			</button>
			{isOpen && (
				<div className="mt-2 space-y-1 pl-3">
					{group.items.map((item) => (
						<SidebarLink key={item.href} item={item} onClick={onNavigate} />
					))}
				</div>
			)}
		</section>
	);
}

function SidebarContent({
	workspace,
	onNavigate,
}: {
	workspace: Workspace | null;
	onNavigate?: () => void;
}) {
	const groups = useMemo(() => {
		if (!workspace) return navigationGroups;

		return navigationGroups
			.map((group) => ({
				...group,
				items: group.items.filter((item) =>
					item.roles.includes(workspace.role),
				),
			}))
			.filter((group) => group.items.length > 0);
	}, [workspace]);

	return (
		<div className="flex h-full flex-col">
			<div className="px-5 py-5">
				<Link href="/" onClick={onNavigate} className="flex items-center gap-3">
					<ApplicationLogo className="h-11 w-11 text-slate-950 drop-shadow-xl" />
					<div>
						<p className="text-base font-bold tracking-tight text-slate-950">
							Akutansia
						</p>
						<p className="text-xs font-medium text-slate-500">
							Akuntansi + POS
						</p>
					</div>
				</Link>

				{workspace && (
					<div className="mt-5 rounded-3xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
							Usaha Aktif
						</p>
						<p className="mt-2 text-sm font-bold text-slate-950">
							{workspace.name}
						</p>
						<p className="mt-1 text-xs font-medium text-slate-500">
							{roleLabel(workspace.role)}
							{workspace.branch ? ` · ${workspace.branch.name}` : ""}
						</p>
					</div>
				)}
			</div>

			<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
				{groups.map((group) => (
					<SidebarGroup
						key={group.title}
						group={group}
						onNavigate={onNavigate}
					/>
				))}
			</div>
		</div>
	);
}

function BranchSwitcher({
	branches,
	workspace,
}: {
	branches: BranchOption[];
	workspace: Workspace | null;
}) {
	if (
		!workspace ||
		!["owner", "admin", "accountant"].includes(workspace.role)
	) {
		return null;
	}

	const activeLabel = workspace.branch?.name ?? "Semua Cabang";

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<button className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm shadow-slate-200/70 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:inline-flex">
					<span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-200" />
					<span className="max-w-[9rem] truncate">{activeLabel}</span>
				</button>
			</Dropdown.Trigger>
			<Dropdown.Content
				width="64"
				contentClasses="overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-2 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl"
			>
				<div className="px-3 pb-2 pt-1">
					<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">
						Konteks Cabang
					</p>
					<p className="mt-1 text-xs font-medium text-slate-500">
						Pilih fokus kerja untuk dashboard dan transaksi baru.
					</p>
				</div>
				<Dropdown.Link
					href={route("branch.switch")}
					method="post"
					data={{ branch_id: "" }}
					as="button"
					className={`rounded-2xl px-3 py-2 font-semibold ${
						workspace.branch
							? "text-slate-600 hover:bg-slate-100"
							: "bg-slate-950 text-white hover:bg-slate-900 focus:bg-slate-900"
					}`}
				>
					Semua Cabang
				</Dropdown.Link>
				{branches.map((branch) => {
					const isActive = workspace.branch?.id === branch.id;

					return (
						<Dropdown.Link
							key={branch.id}
							href={route("branch.switch")}
							method="post"
							data={{ branch_id: branch.id }}
							as="button"
							className={`mt-1 rounded-2xl px-3 py-2 font-semibold ${
								isActive
									? "bg-cyan-100 text-cyan-800 hover:bg-cyan-100 focus:bg-cyan-100"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							<span className="block truncate">
								{branch.name}
								{branch.code ? ` · ${branch.code}` : ""}
							</span>
						</Dropdown.Link>
					);
				})}
			</Dropdown.Content>
		</Dropdown>
	);
}

function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceOption[] }) {
	if (workspaces.length <= 1) return null;

	return (
		<Dropdown>
			<Dropdown.Trigger>
				<button className="hidden rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm transition hover:text-slate-950 sm:inline-flex">
					Ganti Usaha
				</button>
			</Dropdown.Trigger>
			<Dropdown.Content>
				{workspaces.map((workspace) => (
					<Dropdown.Link
						key={workspace.id}
						href={route("tenant.switch", workspace.id)}
						method="post"
						as="button"
					>
						{workspace.name}
					</Dropdown.Link>
				))}
			</Dropdown.Content>
		</Dropdown>
	);
}

export default function Authenticated({
	header,
	children,
}: PropsWithChildren<{ header?: ReactNode }>) {
	const { user, workspace, workspaces, branches } =
		usePage<PageProps>().props.auth;
	const [showingNavigationDropdown, setShowingNavigationDropdown] =
		useState(false);

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/70 bg-white/70 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl lg:block">
				<SidebarContent workspace={workspace} />
			</aside>

			<div className="lg:pl-72">
				<nav className="sticky top-0 z-20 border-b border-white/70 bg-white/75 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
					<div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
						<div className="flex items-center gap-3 lg:hidden">
							<button
								type="button"
								onClick={() => setShowingNavigationDropdown((value) => !value)}
								className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-950"
							>
								<span className="sr-only">Toggle navigation</span>
								<svg
									className="h-6 w-6"
									stroke="currentColor"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
							</button>
							<Link href="/" className="flex items-center gap-2">
								<ApplicationLogo className="h-9 w-9 text-slate-950" />
								<span className="font-bold text-slate-950">Akutansia</span>
							</Link>
						</div>

						<div className="hidden lg:block">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">
								Konteks Aktif
							</p>
							<p className="text-sm font-semibold text-slate-600">
								{workspace?.branch?.name ?? workspace?.name ?? "Usaha Aktif"}
							</p>
						</div>

						<div className="flex items-center gap-3">
							{user.is_platform_admin && (
								<Link
									href={route("platform.tenants.index")}
									className="hidden rounded-full border border-slate-900 bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex"
								>
									Super Admin
								</Link>
							)}
							<BranchSwitcher branches={branches} workspace={workspace} />
							<WorkspaceSwitcher workspaces={workspaces} />
							{workspace && (
								<span className="hidden rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm sm:inline-flex">
									{roleLabel(workspace.role)}
								</span>
							)}
							<Dropdown>
								<Dropdown.Trigger>
									<span className="inline-flex rounded-full">
										<button
											type="button"
											className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold leading-4 text-slate-600 shadow-sm transition hover:text-slate-950 focus:outline-none"
										>
											{user.name}
											<svg
												className="-me-0.5 ms-2 h-4 w-4"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
													clipRule="evenodd"
												/>
											</svg>
										</button>
									</span>
								</Dropdown.Trigger>
								<Dropdown.Content>
									<Dropdown.Link href={route("profile.edit")}>
										Profil
									</Dropdown.Link>
									<Dropdown.Link
										href={route("logout")}
										method="post"
										as="button"
									>
										Keluar
									</Dropdown.Link>
								</Dropdown.Content>
							</Dropdown>
						</div>
					</div>

					{showingNavigationDropdown && (
						<div className="border-t border-white/70 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-2xl lg:hidden">
							<div className="max-h-[calc(100vh-4rem)] overflow-y-auto py-3">
								<SidebarContent
									workspace={workspace}
									onNavigate={() => setShowingNavigationDropdown(false)}
								/>
								<div className="border-t border-slate-200 px-4 pb-4 pt-4">
									<div className="px-4 text-sm font-semibold text-slate-800">
										{user.name}
									</div>
									<div className="px-4 text-xs font-medium text-slate-500">
										{user.email}
									</div>
									<div className="mt-3 space-y-1">
										<ResponsiveNavLink href={route("profile.edit")}>
											Profil
										</ResponsiveNavLink>
										<ResponsiveNavLink
											method="post"
											href={route("logout")}
											as="button"
										>
											Keluar
										</ResponsiveNavLink>
									</div>
								</div>
							</div>
						</div>
					)}
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
