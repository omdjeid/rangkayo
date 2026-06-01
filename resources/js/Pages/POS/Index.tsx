import ApplicationLogo from "@/Components/ApplicationLogo";
import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps, WarehouseOption } from "@/types";
import {
	autoConnectBluetoothPrinter,
	bluetoothSupported,
	printThermalBluetoothReceipt,
	receiptTextFromPayload,
	savedBluetoothPrinter,
	type ThermalReceiptPayload,
} from "@/utils/thermalBluetoothPrinter";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, Link } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface Product {
	id: number;
	sku: string | null;
	name: string;
	unit: string | null;
	selling_price: number;
	cost_price: number;
	stock: number;
}

interface CartItem extends Product {
	quantity: number;
}

interface Sale {
	id: number;
	sale_number: string;
	sold_at: string;
	payment_method: string;
	grand_total: string | number;
}

interface QrisConfig {
	merchant_name?: string;
	qris_string?: string;
	image_url?: string;
	status?: string;
}

interface PrintJob {
	id: string;
	sale_number: string;
	items: { product_name: string; quantity: number; unit_price: number; line_total: number }[];
	grand_total: number;
	paid_total: number;
	change_total: number;
	payment_method: string;
	sold_at: string;
	branch?: { name?: string; code?: string; phone?: string; address?: string };
	cashier?: string;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function getCsrfToken(): string {
	const meta = document.querySelector('meta[name="csrf-token"]');
	if (meta) return meta.getAttribute("content") || "";
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/i);
	return match ? decodeURIComponent(match[1]) : "";
}

/* ─── Receipt renderer (used for auto-print) ─── */
function renderReceiptHTML(job: PrintJob): string {
	const itemsHTML = (job.items || [])
		.map(
			(i) =>
				`<tr><td>${i.product_name}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">${formatCurrency(i.unit_price)}</td><td style="text-align:right">${formatCurrency(i.line_total)}</td></tr>`,
		)
		.join("");
	return `<!DOCTYPE html><html><head><style>
body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:8px}
h3{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse}td{padding:2px 0}
hr{border:none;border-top:1px dashed #000;margin:8px 0}
.total-line{display:flex;justify-content:space-between;font-weight:bold;font-size:13px}
</style></head><body>
<h3>STRUK PEMBAYARAN</h3>
${job.branch?.name ? `<p style="text-align:center">${job.branch.name}</p>` : ""}
<hr/>
<p>No: ${job.sale_number}</p>
<p>Tgl: ${job.sold_at}</p>
<p>Kasir: ${job.cashier || "-"}</p>
<hr/>
<table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Subtotal</th></tr></thead>
<tbody>${itemsHTML}</tbody></table>
<hr/>
<div class="total-line"><span>Total</span><span>${formatCurrency(job.grand_total)}</span></div>
<div class="total-line"><span>Bayar (${job.payment_method})</span><span>${formatCurrency(job.paid_total)}</span></div>
<div class="total-line"><span>Kembali</span><span>${formatCurrency(job.change_total)}</span></div>
<hr/>
<p style="text-align:center">Terima kasih!</p>
</body></html>`;
}

/* ─── Payment Modal ─── */
function PaymentModal({
	total,
	warehouseId,
	cartItems,
	qris,
	onClose,
	onSuccess,
}: {
	total: number;
	warehouseId: string;
	cartItems: { product_id: number; quantity: number }[];
	qris?: QrisConfig | null;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "qris">("cash");
	const [cashAmount, setCashAmount] = useState("");
	const [processing, setProcessing] = useState(false);
	const [copied, setCopied] = useState(false);

	const effectiveCash = paymentMethod === "cash" ? Number(cashAmount) || total : total;
	const change = paymentMethod === "cash" ? Math.max(0, effectiveCash - total) : 0;
	const cashShort = paymentMethod === "cash" && Number(cashAmount) > 0 && Number(cashAmount) < total;

	async function handlePay() {
		if (processing || cashShort) return;
		setProcessing(true);

		const paidTotal = paymentMethod === "cash" ? effectiveCash : total;
		const backendMethod = paymentMethod === "cash" ? "cash" : paymentMethod === "qris" ? "qris" : "bank";
		const csrfToken = getCsrfToken();

		try {
			const res = await fetch(route("pos.checkout", { warehouse_id: warehouseId }), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
				},
				body: JSON.stringify({
					_token: csrfToken,
					warehouse_id: warehouseId,
					payment_method: backendMethod,
					paid_total: paidTotal.toString(),
					items: cartItems,
				}),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `HTTP ${res.status}`);
			}

			await res.json();
			onSuccess();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			alert("Gagal memproses pembayaran: " + message);
			setProcessing(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
			<div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-bold text-slate-950">Pembayaran</h3>
					<button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700">&times;</button>
				</div>

				{/* Total */}
				<div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
					<p className="text-sm text-slate-300">Total Tagihan</p>
					<p className="text-3xl font-bold">{formatCurrency(total)}</p>
				</div>

				{/* Method tabs */}
				<div className="mt-5 flex gap-2">
					{(["cash", "bank", "qris"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setPaymentMethod(m)}
							className={`flex-1 rounded-2xl py-3 text-sm font-bold transition ${
								paymentMethod === m
									? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-200"
									: "bg-slate-100 text-slate-500 hover:bg-slate-200"
							}`}
						>
							{m === "cash" ? "Tunai" : m === "bank" ? "Bank/Transfer" : "QRIS"}
						</button>
					))}
				</div>

				{/* Cash panel */}
				{paymentMethod === "cash" && (
					<div className="mt-4 space-y-3">
						<FormField label="Nominal Dibayar" hint="Masukkan jumlah uang yang diterima dari pelanggan.">
							<input
								className={inputClass}
								type="number"
								placeholder="Contoh: 100000"
								value={cashAmount}
								onChange={(e) => setCashAmount(e.target.value)}
								min={total}
							/>
						</FormField>
						<div className="flex flex-wrap gap-2">
							{[
								{ label: "Sesuai Total", value: total },
								{ label: "Rp50.000", value: 50000 },
								{ label: "Rp100.000", value: 100000 },
								{ label: "Rp200.000", value: 200000 },
							].map((btn) => (
								<button
									key={btn.label}
									type="button"
									onClick={() => setCashAmount(btn.value.toString())}
									className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
								>
									{btn.label}
								</button>
							))}
						</div>
						{change > 0 && (
							<div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
								Kembalian: {formatCurrency(change)}
							</div>
						)}
						{cashShort && (
							<div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">
								Nominal kurang dari total!
							</div>
						)}
					</div>
				)}

				{/* Bank panel */}
				{paymentMethod === "bank" && (
					<div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
						Pelanggan akan membayar via transfer bank. Tekan <strong>Proses Pembayaran</strong> untuk mengonfirmasi.
					</div>
				)}

				{/* QRIS panel */}
				{paymentMethod === "qris" && (
					<div className="mt-4 space-y-3">
						{qris?.qris_string ? (
							<>
								<div className="relative">
									<textarea
										readOnly
										className="w-full rounded-2xl border-slate-200 bg-white p-3 font-mono text-xs shadow-sm"
										rows={4}
										value={qris.qris_string}
									/>
									<button
										type="button"
										onClick={() => {
											navigator.clipboard.writeText(qris.qris_string || "");
											setCopied(true);
											setTimeout(() => setCopied(false), 2000);
										}}
										className="absolute right-2 top-2 rounded-xl bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700 transition hover:bg-cyan-200"
									>
										{copied ? "Tersalin!" : "Salin"}
									</button>
								</div>
								{qris.merchant_name && (
									<p className="text-sm text-slate-500">Merchant: {qris.merchant_name}</p>
								)}
								<div className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
									📱 Scan QRIS di atas oleh pelanggan
								</div>
							</>
						) : (
							<div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
								Konfigurasi QRIS belum tersedia. Silakan hubungi admin.
							</div>
						)}
					</div>
				)}

				{/* Pay button */}
				<button
					type="button"
					disabled={processing || cashShort}
					onClick={handlePay}
					className="mt-5 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 transition hover:bg-cyan-300 disabled:opacity-60"
				>
					{processing ? "Memproses…" : "Proses Pembayaran"}
				</button>
			</div>
		</div>
	);
}

/* ─── Main POS Workspace ─── */
function PosWorkspace({
	products,
	recentSales,
	branch,
	warehouse,
	warehouses,
	openShift,
	requiresShift,
	qris,
}: {
	products: Product[];
	recentSales: Sale[];
	branch: { name: string };
	warehouse: { id: number; name: string };
	warehouses: WarehouseOption[];
	openShift: {
		id: number;
		opened_at: string;
		opening_cash: number;
		expected_cash: number;
	} | null;
	requiresShift: boolean;
	qris?: QrisConfig | null;
}) {
	const [cart, setCart] = useState<CartItem[]>([]);
	const [showPayment, setShowPayment] = useState(false);
	const [btStatus, setBtStatus] = useState(
		bluetoothSupported()
			? savedBluetoothPrinter()
				? "Printer tersimpan siap"
				: "Bluetooth tersedia — belum connect"
			: "Bluetooth tidak didukung browser ini",
	);
	const [btReady, setBtReady] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const [selectedWarehouse] = useState(warehouse.id.toString());
	const printFrameRef = useRef<HTMLIFrameElement | null>(null);

	const total = useMemo(
		() => cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0),
		[cart],
	);

	function addToCart(product: Product) {
		if (product.stock <= 0) return;
		setCart((items) => {
			const existing = items.find((item) => item.id === product.id);
			if (existing) {
				return items.map((item) =>
					item.id === product.id
						? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
						: item,
				);
			}
			return [...items, { ...product, quantity: 1 }];
		});
	}

	function updateQuantity(productId: number, quantity: number) {
		setCart((items) =>
			items.map((item) =>
				item.id === productId
					? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
					: item,
			),
		);
	}

	function showToastMsg(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(null), 4000);
	}

	/* Auto-connect Bluetooth printer on mount */
	useEffect(() => {
		if (!bluetoothSupported()) return;
		autoConnectBluetoothPrinter((msg, ready) => {
			setBtStatus(msg);
			setBtReady(ready);
		}, 2);
	}, []);

	/* Poll for print jobs after successful checkout */
	async function pollPrintJobs() {
		const maxAttempts = 10; // 10 x 1.5s = 15s
		for (let i = 0; i < maxAttempts; i++) {
			await new Promise((r) => setTimeout(r, 1500));
			try {
				const res = await fetch(route("pos.print-jobs.pull"), {
					headers: {
						Accept: "application/json",
						"X-Requested-With": "XMLHttpRequest",
						"X-CSRF-TOKEN": getCsrfToken(),
					},
				});
				if (res.ok) {
					const data = await res.json();
					if (data.jobs && data.jobs.length > 0) {
						printReceipt(data.jobs[0] as PrintJob);
						return;
					}
				}
			} catch {
				// ignore and retry
			}
		}
	}

	async function printReceipt(job: PrintJob) {
		// Try thermal Bluetooth printer first
		if (btReady && bluetoothSupported()) {
			try {
				const payload: ThermalReceiptPayload = {
					tenant_name: "RangKayo",
					sale_number: job.sale_number,
					sold_at: job.sold_at,
					payment_method: job.payment_method,
					subtotal: job.items.reduce((s, i) => s + i.line_total, 0),
					grand_total: job.grand_total,
					paid_total: job.paid_total,
					change_total: job.change_total,
					cashier: job.cashier ?? null,
					branch: job.branch ? { name: job.branch.name ?? null, phone: job.branch.phone ?? null, address: job.branch.address ?? null } : null,
					items: job.items.map((i) => ({
						product_name: i.product_name,
						quantity: i.quantity,
						unit_price: i.unit_price,
						line_total: i.line_total,
					})),
				};
				await printThermalBluetoothReceipt(payload);
				setBtStatus("Struk tercetak via Bluetooth");
				return;
			} catch (err) {
				console.warn("Bluetooth print failed, fallback to browser:", err);
				setBtStatus("Gagal Bluetooth — pakai print browser");
			}
		}

		// Fallback: browser print via iframe
		const iframe = printFrameRef.current;
		if (!iframe) return;
		const doc = iframe.contentDocument || iframe.contentWindow?.document;
		if (!doc) return;
		doc.open();
		doc.write(renderReceiptHTML(job));
		doc.close();
		setTimeout(() => {
			iframe.contentWindow?.print();
		}, 300);
	}

	function openPayment() {
		if (cart.length === 0) return;
		setShowPayment(true);
	}

	async function handlePaymentSuccess() {
		showToastMsg("Transaksi berhasil!");
		setCart([]);

		// Poll for print jobs (non-blocking)
		await pollPrintJobs();

		// Close modal after 3s
		setTimeout(() => {
			setShowPayment(false);
		}, 3000);
	}

	return (
		<div className="min-h-[calc(100vh-9rem)] bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-8">
			{/* Hidden iframe for printing */}
			<iframe
				ref={printFrameRef}
				style={{ position: "absolute", width: 0, height: 0, border: "none", opacity: 0 }}
				title="Receipt Print"
			/>

			{/* Toast */}
			{toast && (
				<div className="fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-200 animate-bounce">
					{toast}
				</div>
			)}

			<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
				{requiresShift && !openShift && (
					<div className="flex flex-col gap-3 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 text-sm font-semibold text-amber-800 shadow-xl shadow-amber-100 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
						<span>Shift kasir belum dibuka. Buka shift sebelum checkout.</span>
						<Link
							href={route("cashier-shifts.index")}
							className="rounded-2xl bg-amber-500 px-4 py-2 text-center font-bold text-white shadow-lg shadow-amber-200"
						>
							Buka Shift
						</Link>
					</div>
				)}
				{openShift && (
					<div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-5 text-sm font-semibold text-emerald-800 shadow-xl shadow-emerald-100 lg:col-span-2">
						Shift aktif sejak {openShift.opened_at} · modal awal{" "}
						{formatCurrency(openShift.opening_cash)}
					</div>
				)}

				{/* Products Grid */}
				<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
								Katalog POS
							</p>
							<h3 className="mt-2 text-xl font-semibold text-slate-950">
								Pilih Produk
							</h3>
							<p className="mt-1 text-sm text-slate-500">
								Klik kartu produk untuk menambahkan ke keranjang.
							</p>
						</div>
						<div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300">
							{branch.name} · {warehouse.name}
						</div>
					</div>

					<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{products.map((product) => (
							<button
								key={product.id}
								type="button"
								onClick={() => addToCart(product)}
								className="rounded-3xl border border-white/80 bg-white/85 p-5 text-left shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
								disabled={product.stock <= 0}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-semibold text-slate-950">
											{product.name}
										</p>
										<p className="mt-1 text-sm text-slate-500">
											{product.sku ?? "-"} · Stok {formatNumber(product.stock)}{" "}
											{product.unit ?? ""}
										</p>
									</div>
									<span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
										Tap
									</span>
								</div>
								<p className="mt-5 text-2xl font-bold tracking-tight text-cyan-700">
									{formatCurrency(product.selling_price)}
								</p>
							</button>
						))}
					</div>
				</section>

				{/* Sidebar */}
				<aside className="space-y-6">
					<div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
									Pembayaran
								</p>
								<h3 className="mt-2 text-lg font-semibold text-slate-950">
									Keranjang
								</h3>
							</div>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
								{cart.length} item
							</span>
						</div>

						<div className="mt-5 space-y-3">
							{cart.length === 0 && (
								<p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
									Belum ada item.
								</p>
							)}
							{cart.map((item) => (
								<div
									key={item.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-4"
								>
									<div className="flex justify-between gap-3">
										<div>
											<p className="font-semibold text-slate-950">
												{item.name}
											</p>
											<p className="text-sm text-slate-500">
												{formatCurrency(item.selling_price)}
											</p>
										</div>
										<button
											type="button"
											className="text-sm font-semibold text-rose-600"
											onClick={() =>
												setCart((items) =>
													items.filter((cartItem) => cartItem.id !== item.id),
												)
											}
										>
											Hapus
										</button>
									</div>
									<FormField
										label="Jumlah"
										hint={`Maksimal sesuai stok: ${formatNumber(item.stock)} ${item.unit ?? ""}`}
									>
										<input
											className={inputClass}
											type="number"
											min="1"
											max={item.stock}
											value={item.quantity}
											onChange={(e) =>
												updateQuantity(item.id, Number(e.target.value))
											}
										/>
									</FormField>
								</div>
							))}
						</div>

						<div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-300/70">
							<p className="text-sm text-slate-300">Total</p>
							<p className="text-3xl font-bold">{formatCurrency(total)}</p>
						</div>

						<div className="mt-4 space-y-3">
							<FormField
								label="Gudang stok"
								required
								hint="Pilih gudang yang stoknya akan dikurangi untuk transaksi ini."
							>
								<select
									className={inputClass}
									value={selectedWarehouse}
									onChange={(e) => {
										window.location.href = route("pos.index", {
											warehouse_id: e.target.value,
										});
									}}
								>
									{warehouses.map((option) => (
										<option key={option.id} value={option.id}>
											{option.branch_name ? `${option.branch_name} · ` : ""}
											{option.name}
											{option.is_default ? " · default" : ""}
										</option>
									))}
								</select>
							</FormField>

							<button
								type="button"
								disabled={cart.length === 0}
								onClick={openPayment}
								className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 transition hover:bg-cyan-300 disabled:opacity-60"
							>
								Bayar
							</button>
						</div>
					</div>

					{/* Recent Sales */}
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Transaksi Terakhir Cabang Ini
						</h3>
						<div className="mt-4 space-y-3">
							{recentSales.map((sale) => (
								<div key={sale.id} className="rounded-2xl bg-slate-100/80 p-4">
									<p className="font-semibold text-slate-800">
										{sale.sale_number}
									</p>
									<p className="text-sm text-slate-500">
										{sale.payment_method} · {formatCurrency(sale.grand_total)}
									</p>
								</div>
							))}
							{recentSales.length === 0 && (
								<p className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-500">
									Belum ada transaksi di cabang ini.
								</p>
							)}
						</div>
					</section>
				</aside>
			</div>

			{/* Payment Modal */}
			{showPayment && (
				<PaymentModal
					total={total}
					warehouseId={selectedWarehouse}
					cartItems={cart.map((item) => ({ product_id: item.id, quantity: item.quantity }))}
					qris={qris}
					onClose={() => setShowPayment(false)}
					onSuccess={handlePaymentSuccess}
				/>
			)}
		</div>
	);
}

/* ─── Exported Page ─── */
export default function PosIndex({
	products,
	recentSales,
	branch,
	warehouse,
	warehouses,
	mode,
	openShift,
	qris,
}: PageProps<{
	products: Product[];
	recentSales: Sale[];
	branch: { name: string };
	warehouse: { id: number; name: string };
	warehouses: WarehouseOption[];
	mode: "admin" | "cashier";
	openShift: {
		id: number;
		opened_at: string;
		opening_cash: number;
		expected_cash: number;
	} | null;
	qris?: QrisConfig | null;
}>) {
	if (mode === "cashier") {
		return (
			<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e0f2fe_100%)]">
				<Head title="POS Kasir" />
				<header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 shadow-sm shadow-slate-200/60 backdrop-blur-2xl">
					<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
						<div className="flex items-center gap-3">
							<ApplicationLogo className="h-11 w-11 text-slate-950 drop-shadow-xl" />
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
									POS Kasir
								</p>
								<h1 className="text-xl font-bold tracking-tight text-slate-950">
									{branch.name}
								</h1>
								<p className="text-sm font-medium text-slate-500">
									Gudang: {warehouse.name}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Link
								href={route("cashier-shifts.index")}
								className="rounded-full border border-cyan-200 bg-cyan-100/80 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm transition hover:text-cyan-900"
							>
								Shift Kasir
							</Link>
							<Link
								href={route("logout")}
								method="post"
								as="button"
								className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:text-slate-950"
							>
								Keluar
							</Link>
						</div>
					</div>
				</header>
				<PosWorkspace
					products={products}
					recentSales={recentSales}
					branch={branch}
					warehouse={warehouse}
					warehouses={warehouses}
					openShift={openShift}
					requiresShift
					qris={qris}
				/>
			</div>
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						POS · {branch.name} · {warehouse.name}
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Kasir
					</h2>
				</div>
			}
		>
			<Head title="POS" />
			<PosWorkspace
				products={products}
				recentSales={recentSales}
				branch={branch}
				warehouse={warehouse}
				warehouses={warehouses}
				openShift={openShift}
				requiresShift={false}
				qris={qris}
			/>
		</AuthenticatedLayout>
	);
}