import type { ReactNode } from "react";

interface FormFieldProps {
	label: string;
	htmlFor?: string;
	required?: boolean;
	hint?: string;
	error?: string;
	children: ReactNode;
}

export default function FormField({
	label,
	htmlFor,
	required = false,
	hint,
	error,
	children,
}: FormFieldProps) {
	return (
		<div className="space-y-2">
			<label
				htmlFor={htmlFor}
				className="block text-sm font-semibold text-slate-700"
			>
				{label} {required && <span className="text-rose-500">*</span>}
			</label>
			{children}
			{hint && !error && (
				<p className="text-xs leading-5 text-slate-500">{hint}</p>
			)}
			{error && (
				<p className="text-xs font-semibold leading-5 text-rose-600">{error}</p>
			)}
		</div>
	);
}
