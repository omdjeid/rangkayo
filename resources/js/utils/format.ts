export function formatCurrency(value: number | string | null | undefined) {
	const numeric = Number(value ?? 0);

	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatNumber(value: number | string | null | undefined) {
	const numeric = Number(value ?? 0);

	return new Intl.NumberFormat("id-ID", {
		maximumFractionDigits: 4,
	}).format(Number.isFinite(numeric) ? numeric : 0);
}
