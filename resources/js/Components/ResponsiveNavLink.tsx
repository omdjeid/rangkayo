import { type InertiaLinkProps, Link } from "@inertiajs/react";

export default function ResponsiveNavLink({
	active = false,
	className = "",
	children,
	...props
}: InertiaLinkProps & { active?: boolean }) {
	return (
		<Link
			{...props}
			className={`mx-3 flex w-[calc(100%-1.5rem)] items-start rounded-2xl px-4 py-3 ${
				active
					? "bg-slate-950 text-white shadow-lg shadow-slate-300"
					: "text-slate-600 hover:bg-white/80 hover:text-slate-950"
			} text-base font-semibold transition duration-150 ease-in-out focus:outline-none ${className}`}
		>
			{children}
		</Link>
	);
}
