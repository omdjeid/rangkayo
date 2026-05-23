import type { SVGAttributes } from "react";

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
	return (
		<svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
			<rect width="64" height="64" rx="18" fill="currentColor" />
			<path
				d="M19 44.5 31.8 17h3.9L49 44.5h-6.2l-2.7-6.1H27.2l-2.6 6.1H19Zm10.5-11.4h8.4l-4.2-9.9-4.2 9.9Z"
				fill="white"
			/>
			<path
				d="M17 48h30"
				stroke="white"
				strokeLinecap="round"
				strokeOpacity="0.72"
				strokeWidth="3"
			/>
		</svg>
	);
}
