import PrintPresetControls from "@/Components/PrintPresetControls";
import { usePrintPreset } from "@/hooks/usePrintPreset";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import type { PrintPreference } from "@/utils/printPresets";
import {
	autoConnectBluetoothPrinter,
	bluetoothSupported,
	printThermalBluetoothReceipt,
	savedBluetoothPrinter,
	testThermalBluetoothPrinter,
	type ThermalReceiptPayload,
} from "@/utils/thermalBluetoothPrinter";
import { Head, Link } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

interface ReceiptSale {
	sale_number: string;
	sold_at: string;
	payment_method: string;
	subtotal: number;
	grand_total: number;
	paid_total: number;
	change_total: number;
	cashier: string | null;
	branch: { name: string | null; phone: string | null; address: string | null };
	items: Array<{
		product_name: string;
		quantity: number;
		unit_price: number;
		line_total: number;
	}>;
}

export default function Receipt({
	tenant,
	sale,
	printPreference,
}: PageProps<{
	tenant: { name: string; logo_url: string | null };
	sale: ReceiptSale;
	printPreference: PrintPreference;
}>) {
	const print = usePrintPreset("thermal-58", printPreference);
	const effectivePrintPreference = useMemo<PrintPreference>(
		() => ({
			...printPreference,
			preset: print.preset,
			width: print.width,
			height: print.height,
			margin: print.margin,
		}),
		[printPreference, print.preset, print.width, print.height, print.margin],
	);
	const [bluetoothStatus, setBluetoothStatus] = useState(
		bluetoothSupported()
			? savedBluetoothPrinter()
				? "Printer tersimpan — mencoba reconnect..."
				: "Bluetooth tersedia"
			: "Web Bluetooth tidak didukung browser ini",
	);
	const [bluetoothReady, setBluetoothReady] = useState(false);
	const [bluetoothBusy, setBluetoothBusy] = useState(false);
	const thermalPayload = useMemo<ThermalReceiptPayload>(
		() => ({
			tenant_name: tenant.name,
			sale_number: sale.sale_number,
			sold_at: sale.sold_at,
			payment_method: sale.payment_method,
			subtotal: sale.subtotal,
			grand_total: sale.grand_total,
			paid_total: sale.paid_total,
			change_total: sale.change_total,
			cashier: sale.cashier,
			branch: sale.branch,
			items: sale.items,
		}),
		[tenant.name, sale],
	);

	useEffect(() => {
		if (printPreference.connection === "browser") {
			setBluetoothStatus(
				printPreference.printer_name
					? `USB/browser: ${printPreference.printer_name}`
					: "USB/browser print aktif",
			);
			return undefined;
		}

		autoConnectBluetoothPrinter((message, ready) => {
			setBluetoothStatus(message);
			setBluetoothReady(ready);
		}, 2).catch(() => {
			setBluetoothStatus("Gagal reconnect — klik Connect manual");
			setBluetoothReady(false);
		});
		const reconnect = () => {
			if (document.visibilityState === "hidden") return;

			void autoConnectBluetoothPrinter((message, ready) => {
				setBluetoothStatus(message);
				setBluetoothReady(ready);
			}, 2);
		};

		document.addEventListener("visibilitychange", reconnect);
		window.addEventListener("focus", reconnect);

		return () => {
			document.removeEventListener("visibilitychange", reconnect);
			window.removeEventListener("focus", reconnect);
		};
	}, [
		printPreference.connection,
		printPreference.printer_name,
		printPreference.auto_print,
		printBluetoothReceipt,
	]);

	async function connectBluetoothPrinter() {
		setBluetoothBusy(true);
		setBluetoothStatus("Connect printer Bluetooth...");
		try {
			await testThermalBluetoothPrinter();
			setBluetoothReady(true);
			setBluetoothStatus("Printer Bluetooth siap dan test print dikirim.");
		} catch (error) {
			setBluetoothReady(false);
			setBluetoothStatus(
				error instanceof Error
					? error.message
					: "Gagal connect printer Bluetooth.",
			);
		} finally {
			setBluetoothBusy(false);
		}
	}

	async function defaultPrint() {
		if (printPreference.connection === "bluetooth") {
			await printBluetoothReceipt();
			return;
		}

		window.print();
	}

	async function printBluetoothReceipt() {
		setBluetoothBusy(true);
		setBluetoothStatus("Mengirim struk ke printer Bluetooth...");
		try {
			await printThermalBluetoothReceipt(
				thermalPayload,
				effectivePrintPreference,
				{ allowPicker: false, reconnectBeforePrint: true },
			);
			setBluetoothReady(true);
			setBluetoothStatus("Struk dikirim ke printer Bluetooth.");
		} catch (error) {
			setBluetoothReady(false);
				setBluetoothStatus(
					error instanceof Error
						? error.message + " Klik Connect Printer jika perangkat belum tersambung."
						: "Gagal print Bluetooth. Klik Connect Printer atau gunakan Cetak Browser.",
				);
		} finally {
			setBluetoothBusy(false);
		}
	}

	return (
		<main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">
			<Head title={`Struk ${sale.sale_number}`} />
			<style>{print.printStyle}</style>
			<PrintPresetControls
				preset={print.preset}
				width={print.width}
				height={print.height}
				margin={print.margin}
				onPresetChange={print.setPreset}
				onWidthChange={print.setWidth}
				onHeightChange={print.setHeight}
				onMarginChange={print.setMargin}
				onPrint={() => void printBluetoothReceipt()}
			/>
			<section className="mx-auto mb-6 max-w-5xl rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur-2xl print:hidden">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-sm font-semibold text-slate-500">
							Koneksi printer POS
						</p>
						<h2 className="text-xl font-bold text-slate-950">
							{printPreference.connection === "bluetooth"
								? "Cetak langsung ke Bluetooth thermal"
								: "Cetak via USB / dialog browser"}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Default koneksi diambil dari Pengaturan Cetak. Bluetooth bisa
							direct di browser HP yang mendukung Web Bluetooth; USB/browser
							mengikuti dialog print perangkat yang sedang dipakai.
						</p>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<span
							className={`rounded-full px-3 py-1 text-xs font-bold ${
								bluetoothReady
									? "bg-emerald-50 text-emerald-700"
									: "bg-amber-50 text-amber-700"
							}`}
						>
							{bluetoothStatus}
						</span>
						<button
							type="button"
							onClick={connectBluetoothPrinter}
							disabled={
								bluetoothBusy ||
								!bluetoothSupported() ||
								printPreference.connection === "browser"
							}
							className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-700 shadow-lg shadow-slate-200 disabled:opacity-60"
						>
							Connect / Test
						</button>
						<button
							type="button"
							onClick={printBluetoothReceipt}
							disabled={
								bluetoothBusy ||
								!bluetoothSupported() ||
								printPreference.connection === "browser"
							}
							className="rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 disabled:opacity-60"
						>
							Cetak Bluetooth
						</button>
					</div>
				</div>
			</section>
			<div className="print-sheet mx-auto max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
				<div className="text-center">
t				{tenant.logo_url && (
						<img src={tenant.logo_url} alt="Logo" className="mx-auto mb-2 max-h-16 object-contain" />
					)}
					<h1 className="text-xl font-black">{tenant.name}</h1>
					<p className="text-sm text-slate-500">{sale.branch.name}</p>
					<p className="text-xs text-slate-400">{sale.branch.address}</p>
					{sale.branch.phone && (
						<p className="text-xs text-slate-400">Telp: {sale.branch.phone}</p>
					)}
				</div>
				<div className="my-4 border-t border-dashed border-slate-300" />
				<div className="text-xs text-slate-600">
					<p>No: {sale.sale_number}</p>
					<p>Waktu: {sale.sold_at}</p>
					<p>Kasir: {sale.cashier ?? "-"}</p>
				</div>
				<div className="my-4 border-t border-dashed border-slate-300" />
				<div className="space-y-3">
					{sale.items.map((item, index) => (
						<div key={index}>
							<p className="font-semibold">{item.product_name}</p>
							<div className="flex justify-between text-sm text-slate-600">
								<span>
									{formatNumber(item.quantity)} ×{" "}
									{formatCurrency(item.unit_price)}
								</span>
								<span>{formatCurrency(item.line_total)}</span>
							</div>
						</div>
					))}
				</div>
				<div className="my-4 border-t border-dashed border-slate-300" />
				<div className="space-y-1 text-sm">
					<div className="flex justify-between">
						<span>Subtotal</span>
						<span>{formatCurrency(sale.subtotal)}</span>
					</div>
					<div className="flex justify-between font-bold">
						<span>Total</span>
						<span>{formatCurrency(sale.grand_total)}</span>
					</div>
					<div className="flex justify-between">
						<span>Dibayar</span>
						<span>{formatCurrency(sale.paid_total)}</span>
					</div>
					<div className="flex justify-between">
						<span>Kembalian</span>
						<span>{formatCurrency(sale.change_total)}</span>
					</div>
					<div className="flex justify-between">
						<span>Metode</span>
						<span>{sale.payment_method}</span>
					</div>
				</div>
				<p className="mt-6 text-center text-xs text-slate-500">Terima kasih.</p>
			</div>
			<div className="mx-auto mt-6 flex max-w-sm gap-3 print:hidden">
				<button
					onClick={defaultPrint}
					className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg"
				>
					{printPreference.connection === "bluetooth"
						? "Cetak Default"
						: "Cetak"}
				</button>
				<Link
					href={route("pos.index")}
					className="flex-1 rounded-2xl bg-white px-5 py-3 text-center font-bold text-slate-700 shadow-lg"
				>
					Kembali POS
				</Link>
			</div>
		</main>
	);
}
