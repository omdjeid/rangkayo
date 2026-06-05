import type { SVGAttributes } from "react";

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
	return (
		<svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="rangkayo-logo" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
					<stop stopColor="#0f766e" />
					<stop offset="1" stopColor="#111827" />
				</linearGradient>
			</defs>
			<rect width="64" height="64" rx="18" fill="url(#rangkayo-logo)" />
			<text
				x="32"
				y="43"
				fill="white"
				fontFamily="Georgia, serif"
				fontSize="34"
				fontWeight="700"
				textAnchor="middle"
			>
				R
			</text>
			<path d="M18 49h28" stroke="white" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="3" />
		</svg>
	);
}
