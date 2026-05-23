import { type InertiaLinkProps, Link } from "@inertiajs/react";

export default function NavLink({
	active = false,
	className = "",
	children,
	...props
}: InertiaLinkProps & { active: boolean }) {
	return (
		<Link
			{...props}
			className={
				"inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition duration-150 ease-in-out focus:outline-none " +
				(active
					? "bg-slate-950 text-white shadow-lg shadow-slate-300"
					: "text-slate-600 hover:bg-white/80 hover:text-slate-950") +
				` ${className}`
			}
		>
			{children}
		</Link>
	);
}
