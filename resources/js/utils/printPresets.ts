export type PrintPresetKey =
	| "thermal-58"
	| "thermal-90"
	| "standard-a4"
	| "custom-paper"
	| "dot-matrix";

export type PrintConnectionKey = "browser" | "bluetooth";

export interface PrintPreference {
	preset: PrintPresetKey;
	width: string;
	height: string;
	margin: string;
	connection: PrintConnectionKey;
	printer_name: string;
	auto_print: boolean;
}

export interface PrintPreset {
	key: PrintPresetKey;
	label: string;
	description: string;
	width: string;
	height: string;
	margin: string;
	font: "sans" | "mono";
	compact: boolean;
}

export const printPresets: PrintPreset[] = [
	{
		key: "thermal-58",
		label: "Thermal 58mm",
		description: "Struk ringkas untuk printer thermal kecil.",
		width: "58mm",
		height: "auto",
		margin: "2mm",
		font: "mono",
		compact: true,
	},
	{
		key: "thermal-90",
		label: "Thermal 90mm",
		description: "Struk lebih lega untuk thermal 80/90mm.",
		width: "90mm",
		height: "auto",
		margin: "4mm",
		font: "mono",
		compact: false,
	},
	{
		key: "standard-a4",
		label: "Printer biasa A4",
		description: "Format dokumen penuh untuk invoice/arsip.",
		width: "210mm",
		height: "297mm",
		margin: "12mm",
		font: "sans",
		compact: false,
	},
	{
		key: "custom-paper",
		label: "Printer biasa custom",
		description: "Ukuran kertas bisa diatur manual.",
		width: "210mm",
		height: "297mm",
		margin: "10mm",
		font: "sans",
		compact: false,
	},
	{
		key: "dot-matrix",
		label: "Dot matrix custom",
		description: "Layout monospace untuk continuous form/dot matrix.",
		width: "241mm",
		height: "140mm",
		margin: "6mm",
		font: "mono",
		compact: true,
	},
];

export function findPrintPreset(key: string | null | undefined) {
	return printPresets.find((preset) => preset.key === key) ?? printPresets[0];
}
