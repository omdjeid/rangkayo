import { printPresets, type PrintPresetKey } from "@/utils/printPresets";

interface PrintPresetControlsProps {
	preset: PrintPresetKey;
	width: string;
	height: string;
	margin: string;
	onPresetChange: (preset: PrintPresetKey) => void;
	onWidthChange: (width: string) => void;
	onHeightChange: (height: string) => void;
	onMarginChange: (margin: string) => void;
	onPrint: () => void;
}

const inputClass =
	"rounded-2xl border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function PrintPresetControls({
	preset,
	width,
	height,
	margin,
	onPresetChange,
	onWidthChange,
	onHeightChange,
	onMarginChange,
	onPrint,
}: PrintPresetControlsProps) {
	return (
		<section className="mx-auto mb-6 max-w-5xl rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur-2xl print:hidden">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p className="text-sm font-semibold text-slate-500">Preset cetak</p>
					<h2 className="text-xl font-bold text-slate-950">
						Pilih format printer
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						Thermal 58/90mm, printer biasa/custom, atau dot matrix.
					</p>
				</div>
				<div className="grid gap-3 md:grid-cols-4 lg:min-w-[620px]">
					<select
						className={inputClass}
						value={preset}
						onChange={(event) =>
							onPresetChange(event.target.value as PrintPresetKey)
						}
					>
						{printPresets.map((option) => (
							<option key={option.key} value={option.key}>
								{option.label}
							</option>
						))}
					</select>
					<input
						className={inputClass}
						placeholder="Lebar, contoh 58mm"
						value={width}
						onChange={(event) => onWidthChange(event.target.value)}
					/>
					<input
						className={inputClass}
						placeholder="Tinggi / auto"
						value={height}
						onChange={(event) => onHeightChange(event.target.value)}
					/>
					<input
						className={inputClass}
						placeholder="Margin"
						value={margin}
						onChange={(event) => onMarginChange(event.target.value)}
					/>
				</div>
				<button
					type="button"
					onClick={onPrint}
					className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg shadow-slate-300"
				>
					Cetak
				</button>
			</div>
		</section>
	);
}
