import {
	findPrintPreset,
	printPresets,
	type PrintPreference,
	type PrintPresetKey,
} from "@/utils/printPresets";
import { useMemo, useState } from "react";

export function usePrintPreset(
	defaultPreset: PrintPresetKey = "thermal-58",
	defaultPreference?: PrintPreference,
) {
	const initial = findPrintPreset(defaultPreference?.preset ?? defaultPreset);
	const [preset, setPreset] = useState<PrintPresetKey>(initial.key);
	const [width, setWidth] = useState(defaultPreference?.width ?? initial.width);
	const [height, setHeight] = useState(
		defaultPreference?.height ?? initial.height,
	);
	const [margin, setMargin] = useState(
		defaultPreference?.margin ?? initial.margin,
	);
	const selectedPreset = findPrintPreset(preset);
	const pageHeight = height.trim().toLowerCase() === "auto" ? "auto" : height;
	const printStyle = useMemo(
		() => `
@page {
	size: ${width} ${pageHeight};
	margin: ${margin};
}
@media print {
	body { background: #fff !important; }
	.print-sheet {
		width: ${width};
		max-width: ${width};
		min-height: ${pageHeight === "auto" ? "auto" : pageHeight};
		font-family: ${selectedPreset.font === "mono" ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" : "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"};
		font-size: ${selectedPreset.compact ? "11px" : "13px"};
		box-shadow: none !important;
		border-radius: 0 !important;
	}
	.print-compact-hide { display: ${selectedPreset.compact ? "none" : "initial"}; }
}
`,
		[width, pageHeight, margin, selectedPreset],
	);

	function applyPreset(key: PrintPresetKey) {
		const next = printPresets.find((option) => option.key === key) ?? initial;
		setPreset(next.key);
		setWidth(next.width);
		setHeight(next.height);
		setMargin(next.margin);
	}

	return {
		preset,
		width,
		height,
		margin,
		selectedPreset,
		printStyle,
		setPreset: applyPreset,
		setWidth,
		setHeight,
		setMargin,
	};
}
