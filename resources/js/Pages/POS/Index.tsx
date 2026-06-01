import type { PageProps, WarehouseOption } from "@/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { formatCurrency } from "@/utils/format";
import {
	autoConnectBluetoothPrinter,
	bluetoothSupported,
	savedBluetoothPrinter,
} from "@/utils/thermalBluetoothPrinter";
import { Head, Link } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

function getCsrfToken(): string {
	const el = document.querySelector('meta[name="csrf-token"]');
	if (el) return el.getAttribute("content") || "";
	const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return m ? decodeURIComponent(m[1]) : "";
}

interface CartItem {
	id: number;
	sku: string;
	name: string;
	unit: string | null;
	selling_price: number;
	cost_price: number;
	stock: number;
	qty: number;
}

type PaymentMethod = "cash" | "bank" | "qris";

export default function POS({
	mode,
	openShift,
	branch,
	warehouse,
	warehouses,
	products,
	qris,
	recentSales,
}: PageProps<{
	mode: "cashier" | "admin";
	openShift: {
		id: number;
		opened_at: string;
		opening_cash: number;
		expected_cash: number;
	} | null;
	branch: { id: number; name: string; code: string | null };
	warehouse: { id: number; name: string; code: string | null };
	warehouses: WarehouseOption[];
	products: Array<{
		id: number;
		sku: string;
		name: string;
		unit: string | null;
		selling_price: number;
		cost_price: number;
		stock: number;
	}>;
	qris: {
		merchant_name: string;
		qris_string: string;
		image_url: string;
		status: string;
	};
	recentSales: Array<{
		id: number;
		sale_number: string;
		sold_at: string;
		payment_method: string;
		grand_total: string | number;
	}>;
}>) {
	const [cart, setCart] = useState<CartItem[]>([]);
	const [warehouseId, setWarehouseId] = useState(warehouse.id);
	const [showPayment, setShowPayment] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
	const [cashAmount, setCashAmount] = useState("");
	const [processing, setProcessing] = useState(false);
	const [copied, setCopied] = useState(false);
	const [toast, setToast] = useState<string | null>(null);

	// Bluetooth printer state
	const [btStatus, setBtStatus] = useState(
		bluetoothSupported()
			? savedBluetoothPrinter()
				? "Printer tersimpan siap"
				: "Bluetooth tersedia — belum connect"
			: "Bluetooth tidak didukung",
	);
	const [btReady, setBtReady] = useState(false);

	// Auto-connect Bluetooth printer
	useEffect(() => {
		if (!bluetoothSupported()) return;
		autoConnectBluetoothPrinter((msg, ready) => {
			setBtStatus(msg);
			setBtReady(ready);
		}, 2);
	}, []);

	const total = useMemo(
		() => cart.reduce((sum, item) => sum + item.selling_price * item.qty, 0),
		[cart],
	);

	const effectiveCash = useMemo(() => {
		const parsed = parseInt(cashAmount.replace(/\D/g, ""), 10);
		return isNaN(parsed) ? 0 : parsed;
	}, [cashAmount]);

	const cashShort = paymentMethod === "cash" && effectiveCash < total;

	function addToCart(product: (typeof products)[number]) {
		setCart((prev) => {
			const existing = prev.find((item) => item.id === product.id);
			if (existing) {
				return prev.map((item) =>
					item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
				);
			}
			return [...prev, { ...product, qty: 1 }];
		});
	}

	function updateQty(id: number, delta: number) {
		setCart((prev) =>
			prev
				.map((item) =>
					item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
				)
				.filter((item) => item.qty > 0),
		);
	}

	function removeItem(id: number) {
		setCart((prev) => prev.filter((item) => item.id !== id));
	}

	function openPayment() {
		if (cart.length === 0) return;
		setShowPayment(true);
	}

	function showToastMsg(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(null), 4000);
	}

	async function handleCheckout() {
		if (processing || cashShort) return;
		setProcessing(true);

		const paidTotal = paymentMethod === "cash" ? effectiveCash : total;
		const backendMethod =
			paymentMethod === "cash"
				? "cash"
				: paymentMethod === "qris"
					? "qris"
					: "bank";
		const csrfToken = getCsrfToken();

		try {
			const res = await fetch(
				route("pos.checkout", { warehouse_id: warehouseId }),
				{
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
						items: cart.map((item) => ({
							product_id: item.id,
							quantity: item.qty,
						})),
					}),
				},
			);

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `HTTP ${res.status}`);
			}

			const data = await res.json();
			showToastMsg("Transaksi berhasil!");
			setCart([]);
			setCashAmount("");
			setShowPayment(false);

			// Redirect to receipt page (Receipt.tsx handles thermal printing)
			if (data.receipt_url) {
				setTimeout(() => {
					window.location.href = data.receipt_url;
				}, 500);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			alert("Gagal memproses pembayaran: " + message);
		} finally {
			setProcessing(false);
		}
	}

	const requiresShift = mode === "cashier";

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">
						{branch.name}
						{branch.code ? ` (${branch.code})` : ""} · {warehouse.name}
					</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Kasir
					</h2>
				</div>
			}
		>
			<Head title="POS" />

			<div className="min-h-[calc(100vh-9rem)] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-8">
				{/* Toast */}
				{toast && (
					<div className="fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-200 animate-bounce">
						{toast}
					</div>
				)}

				{requiresShift && !openShift && (
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="mb-6 flex flex-col gap-3 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 text-sm font-semibold text-amber-800 shadow-xl shadow-amber-100 sm:flex-row sm:items-center sm:justify-between">
							<span>Shift kasir belum dibuka. Buka shift sebelum transaksi.</span>
							<Link
								href={route("cashier-shifts.index")}
								className="rounded-2xl bg-amber-500 px-4 py-2 text-center font-bold text-white shadow-lg shadow-amber-200"
							>
								Buka Shift
							</Link>
						</div>
					</div>
				)}

				<div className="mx-auto grid max-w-7xl gap-4 px-3 sm:px-4 md:gap-6 md:px-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
					{/* Products */}
					<section className="rounded-2xl border border-white/80 bg-white/70 p-3 sm:rounded-[2rem] sm:p-5 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<p className="text-xs font-bold uppercase tracking-widest text-cyan-600">
									Katalog POS
								</p>
								<h3 className="text-lg font-bold text-slate-950">Pilih Produk</h3>
							</div>
							<p className="text-xs text-slate-500">
								Klik kartu produk untuk menambahkan ke keranjang.
							</p>
						</div>

						{mode !== "cashier" && (
							<div className="mb-4">
								<select
									value={warehouseId}
									onChange={(e) => setWarehouseId(Number(e.target.value))}
									className="rounded-xl border-slate-200 bg-white/80 text-sm shadow-sm"
								>
									{warehouses.map((w) => (
										<option key={w.id} value={w.id}>
											{w.branch_name ? `${w.branch_name} · ` : ""}
											{w.name} {w.is_default ? "· default" : ""}
										</option>
									))}
								</select>
							</div>
						)}

						<div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
							{products.map((product) => (
								<button
									key={product.id}
									type="button"
									onClick={() => addToCart(product)}
									className="rounded-xl border border-slate-100 bg-white/80 p-3 text-left sm:rounded-[1.5rem] sm:p-4 shadow-md shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
									disabled={product.stock <= 0}
								>
									<p className="font-bold text-slate-950">{product.name}</p>
									<p className="mt-1 text-xs text-slate-500">
										{product.sku} · Stok {product.stock} {product.unit || "pcs"}
									</p>
									<p className="mt-2 text-sm font-bold text-cyan-700">
										{formatCurrency(product.selling_price)}
									</p>
									<span className="mt-2 inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
										Tap
									</span>
								</button>
							))}

							{products.length === 0 && (
								<p className="col-span-full py-8 text-center text-sm text-slate-500">
									Belum ada produk aktif.
								</p>
							)}
						</div>
					</section>

					{/* Cart & Payment */}
					<div className="flex flex-col gap-5">
						<section className="rounded-2xl border border-white/80 bg-white/75 p-3 sm:rounded-[2rem] sm:p-5 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<p className="text-xs font-bold uppercase tracking-widest text-cyan-600">
								Pembayaran
							</p>
							<h3 className="mt-1 text-lg font-bold text-slate-950">Keranjang</h3>

							<div className="mt-3 flex items-center justify-between text-sm text-slate-500">
								<span>
									{cart.reduce((sum, item) => sum + item.qty, 0)} item
								</span>
							</div>

							<div className="mt-3 space-y-3">
								{cart.length === 0 && (
									<p className="text-sm text-slate-500">Belum ada item.</p>
								)}
								{cart.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3"
									>
										<div className="flex-1">
											<p className="text-sm font-bold text-slate-900">
												{item.name}
											</p>
											<p className="text-xs text-slate-500">
												{formatCurrency(item.selling_price)} × {item.qty}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => updateQty(item.id, -1)}
												className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700"
											>
												−
											</button>
											<span className="w-6 text-center text-sm font-bold">
												{item.qty}
											</span>
											<button
												type="button"
												onClick={() => updateQty(item.id, 1)}
												className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700"
											>
												+
											</button>
											<button
												type="button"
												onClick={() => removeItem(item.id)}
												className="ml-1 text-xs text-red-500"
											>
												✕
											</button>
										</div>
										<p className="w-20 text-right text-sm font-bold text-slate-900">
											{formatCurrency(item.selling_price * item.qty)}
										</p>
									</div>
								))}
							</div>

							<div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
								<p className="text-sm font-bold text-slate-500">Total</p>
								<p className="text-xl font-black text-slate-950">
									{formatCurrency(total)}
								</p>
							</div>

							<div className="mt-3">
								<label className="text-xs font-medium text-slate-600">
									Gudang stok *
								</label>
								<select
									value={warehouseId}
									onChange={(e) => setWarehouseId(Number(e.target.value))}
									className="mt-1 w-full rounded-xl border-slate-200 bg-white/80 text-sm shadow-sm"
								>
									{warehouses.map((w) => (
										<option key={w.id} value={w.id}>
											{w.branch_name ? `${w.branch_name} · ` : ""}
											{w.name} {w.is_default ? "· default" : ""}
										</option>
									))}
								</select>
							</div>

							{/* Bluetooth printer status */}
							<div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
								<span
									className={
										"inline-block h-2 w-2 rounded-full " +
										(btReady
											? "bg-emerald-500"
											: bluetoothSupported()
												? "bg-amber-500"
												: "bg-slate-300")
									}
								/>
								<span className="flex-1 text-xs text-slate-600">
									{btStatus}
								</span>
								{!btReady && (
									<button
										type="button"
										className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-bold text-white"
										onClick={async () => {
											if (!bluetoothSupported()) {
												setBtStatus(
													"Browser tidak support Bluetooth. Gunakan Chrome Android.",
												);
												return;
											}
											await autoConnectBluetoothPrinter((msg, ready) => {
												setBtStatus(msg);
												setBtReady(ready);
											}, 2);
										}}
									>
										Connect Printer
									</button>
								)}
							</div>

							<button
								type="button"
								disabled={cart.length === 0}
								onClick={openPayment}
								className="mt-3 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 transition hover:bg-cyan-300 disabled:opacity-60"
							>
								Bayar
							</button>
						</section>

						{/* Recent Sales */}
						<section className="rounded-2xl border border-white/80 bg-white/75 p-4 sm:rounded-[2rem] sm:p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
							<h3 className="text-lg font-semibold text-slate-950">
								Transaksi Terakhir Cabang Ini
							</h3>
							<div className="mt-4 space-y-3">
								{recentSales.length === 0 && (
									<p className="text-sm text-slate-500">
										Belum ada transaksi.
									</p>
								)}
								{recentSales.map((sale) => (
									<div
										key={sale.id}
										className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3"
									>
										<div>
											<p className="text-sm font-bold text-slate-900">
												{sale.sale_number}
											</p>
											<p className="text-xs text-slate-500">
												{sale.payment_method} · {sale.sold_at}
											</p>
										</div>
										<p className="text-sm font-bold text-slate-950">
											{formatCurrency(sale.grand_total)}
										</p>
									</div>
								))}
							</div>
						</section>
					</div>
				</div>

				{/* Payment Modal */}
				{showPayment && (
					<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4">
						<div className="w-full max-w-lg rounded-t-3xl border border-white/60 bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
							<div className="flex items-center justify-between">
								<h3 className="text-xl font-bold text-slate-950">Pembayaran</h3>
								<button
									type="button"
									onClick={() => setShowPayment(false)}
									className="text-slate-400 hover:text-slate-600"
								>
									✕
								</button>
							</div>

							<p className="mt-2 text-2xl font-black text-slate-950">
								{formatCurrency(total)}
							</p>

							{/* Payment method tabs */}
							<div className="mt-4 flex gap-2">
								{(["cash", "bank", "qris"] as PaymentMethod[]).map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setPaymentMethod(m)}
										className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
											paymentMethod === m
												? "bg-slate-950 text-white"
												: "bg-slate-100 text-slate-600 hover:bg-slate-200"
										}`}
									>
										{m === "cash" ? "Tunai" : m === "bank" ? "Bank" : "QRIS"}
									</button>
								))}
							</div>

							{/* Payment method content */}
							<div className="mt-4">
								{paymentMethod === "cash" && (
									<div>
										<label className="text-sm font-medium text-slate-600">
											Nominal Dibayar
										</label>
										<input
											type="text"
											value={cashAmount}
											onChange={(e) => setCashAmount(e.target.value)}
											placeholder="Masukkan jumlah uang"
											className="mt-1 w-full rounded-xl border-slate-200 bg-white text-lg font-bold shadow-sm"
										/>
										<div className="mt-2 flex flex-wrap gap-2">
											{[
												{ label: "Sesuai Total", value: total },
												{ label: "Rp50.000", value: 50000 },
												{ label: "Rp100.000", value: 100000 },
												{ label: "Rp200.000", value: 200000 },
											].map((opt) => (
												<button
													key={opt.label}
													type="button"
													onClick={() =>
														setCashAmount(opt.value.toString())
													}
													className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
												>
													{opt.label}
												</button>
											))}
										</div>
										{effectiveCash > 0 && (
											<p className="mt-2 text-sm">
												Kembalian:{" "}
												<span className="font-bold">
													{formatCurrency(
														Math.max(0, effectiveCash - total),
													)}
												</span>
												{cashShort && (
													<span className="ml-2 text-red-500">
														Uang kurang!
													</span>
												)}
											</p>
										)}
									</div>
								)}

								{paymentMethod === "bank" && (
									<div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
										Pelanggan akan membayar via transfer bank. Tekan{" "}
										<strong>Proses Pembayaran</strong> untuk mengonfirmasi.
									</div>
								)}

								{paymentMethod === "qris" && (
									<div>
										{qris.qris_string ? (
											<div>
												<p className="text-sm text-slate-600 mb-2">
													{qris.merchant_name && (
														<span className="font-bold">
															{qris.merchant_name}
														</span>
													)}{" "}
													— Scan QRIS di bawah oleh pelanggan
												</p>
												<div className="rounded-xl bg-slate-50 p-4">
													<textarea
														readOnly
														value={qris.qris_string}
														className="w-full rounded-lg bg-white p-3 font-mono text-xs text-slate-700 border border-slate-200"
														rows={4}
													/>
													<button
														type="button"
														onClick={() => {
															navigator.clipboard.writeText(
																qris.qris_string,
															);
															setCopied(true);
															setTimeout(() => setCopied(false), 2000);
														}}
														className="mt-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-white"
													>
														{copied ? "Tersalin!" : "Salin QRIS String"}
													</button>
												</div>
											</div>
										) : (
											<div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
												QRIS belum dikonfigurasi. Atur di Pengaturan →
												Pembayaran.
											</div>
										)}
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={handleCheckout}
								disabled={processing || cashShort}
								className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
							>
								{processing ? "Memproses…" : "Proses Pembayaran"}
							</button>
						</div>
					</div>
				)}
			</div>
		</AuthenticatedLayout>
	);
}
