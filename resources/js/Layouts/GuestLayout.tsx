import ApplicationLogo from "@/Components/ApplicationLogo";
import { Link } from "@inertiajs/react";
import type { PropsWithChildren } from "react";

export default function Guest({ children }: PropsWithChildren) {
	return (
		<div className="flex min-h-screen flex-col items-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 pt-6 sm:justify-center sm:pt-0">
			<div>
				<Link href="/">
					<ApplicationLogo className="h-20 w-20 text-slate-950 drop-shadow-xl" />
				</Link>
			</div>

			<div className="mt-6 w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 px-6 py-5 shadow-2xl shadow-slate-200/80 backdrop-blur-2xl sm:max-w-md">
				{children}
			</div>
		</div>
	);
}
