import ApplicationLogo from "@/Components/ApplicationLogo";
import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, Link, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

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

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function PosWorkspace({
	products,
	recentSales,
	branch,
	warehouse,
	openShift,
	requiresShift,
}: {
	products: Product[];
	recentSales: Sale[];
	branch: { name: string };
	warehouse: { name: string };
	openShift: {
		id: number;
		opened_at: string;
		opening_cash: number;
		expected_cash: number;
	} | null;
	requiresShift: boolean;
}) {
	const [cart, setCart] = useState<CartItem[]>([]);
	const form = useForm({
		payment_method: "cash",
		paid_total: "",
		items: [] as { product_id: number; quantity: number }[],
	});

	const total = useMemo(
		() =>
			cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0),
		[cart],
	);
	const paid = Number(form.data.paid_total || total);
	const change = Math.max(0, paid - total);

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

	function checkout(event: React.FormEvent) {
		event.preventDefault();
		form.setData({
			payment_method: form.data.payment_method,
			paid_total: form.data.paid_total || total.toString(),
			items: cart.map((item) => ({
				product_id: item.id,
				quantity: item.quantity,
			})),
		});
		form.post(route("pos.checkout"), {
			preserveScroll: true,
			onSuccess: () => {
				setCart([]);
				form.reset("paid_total");
			},
		});
	}

	return (
		<div className="min-h-[calc(100vh-9rem)] bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-8">
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

				<aside className="space-y-6">
					<form
						onSubmit={checkout}
						className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
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
							<p className="mt-2 text-sm text-cyan-200">
								Kembalian: {formatCurrency(change)}
							</p>
						</div>

						<div className="mt-4 space-y-3">
							<FormField
								label="Metode Pembayaran"
								required
								hint="Tunai masuk akun Kas, Bank/QRIS masuk akun Bank."
								error={form.errors.payment_method}
							>
								<select
									className={inputClass}
									value={form.data.payment_method}
									onChange={(e) =>
										form.setData("payment_method", e.target.value)
									}
								>
									<option value="cash">Tunai</option>
									<option value="bank">Bank/QRIS</option>
								</select>
							</FormField>
							<FormField
								label="Nominal Dibayar"
								hint="Kosongkan jika pembayaran pas sesuai total transaksi."
								error={form.errors.paid_total}
							>
								<input
									className={inputClass}
									type="number"
									placeholder="Contoh: 100000"
									value={form.data.paid_total}
									onChange={(e) => form.setData("paid_total", e.target.value)}
								/>
							</FormField>
							<button
								disabled={form.processing || cart.length === 0}
								className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 transition hover:bg-cyan-300 disabled:opacity-60"
							>
								Selesaikan Transaksi
							</button>
						</div>
					</form>

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
		</div>
	);
}

export default function PosIndex({
	products,
	recentSales,
	branch,
	warehouse,
	mode,
	openShift,
}: PageProps<{
	products: Product[];
	recentSales: Sale[];
	branch: { name: string };
	warehouse: { name: string };
	mode: "admin" | "cashier";
	openShift: {
		id: number;
		opened_at: string;
		opening_cash: number;
		expected_cash: number;
	} | null;
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
					openShift={openShift}
					requiresShift
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
				openShift={openShift}
				requiresShift={false}
			/>
		</AuthenticatedLayout>
	);
}
