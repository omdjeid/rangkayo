import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps, WarehouseOption } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";

interface Product {
	id: number;
	sku: string | null;
	name: string;
	cost_price: string | number;
	selling_price: string | number;
}

interface Movement {
	id: number;
	movement_number: string;
	movement_at: string;
	product: string;
	warehouse: string;
	quantity_in: number;
	unit_cost: number;
	total_cost: number;
}

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function StockInIndex({
	products,
	movements,
	branch,
	warehouse,
	warehouses,
}: PageProps<{
	products: Product[];
	movements: Movement[];
	branch: { name: string };
	warehouse: { id: number; name: string };
	warehouses: WarehouseOption[];
}>) {
	const form = useForm({
		warehouse_id: warehouse.id.toString(),
		product_id: products[0]?.id?.toString() ?? "",
		quantity: "1",
		unit_cost: products[0]?.cost_price?.toString() ?? "0",
		payment_account_code: "1010",
	});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		form.post(
			route("stock-in.store", { warehouse_id: form.data.warehouse_id }),
			{
				preserveScroll: true,
				onSuccess: () => form.reset("quantity"),
			},
		);
	}

	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Persediaan</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Stok Masuk
					</h2>
				</div>
			}
		>
			<Head title="Stok Masuk" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:px-8">
					<form
						onSubmit={submit}
						className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
					>
						<p className="text-sm font-medium text-cyan-700">
							{branch.name} · {warehouse.name}
						</p>
						<h3 className="mt-1 text-lg font-semibold text-slate-950">
							Input Stok Masuk
						</h3>
						<div className="mt-5 space-y-4">
							<FormField
								label="Gudang tujuan"
								required
								hint="Pilih gudang yang menerima stok masuk."
								error={form.errors.warehouse_id}
							>
								<select
									className={inputClass}
									value={form.data.warehouse_id}
									onChange={(e) => form.setData("warehouse_id", e.target.value)}
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

							<FormField
								label="Produk"
								required
								hint="Produk yang stoknya akan ditambah."
								error={form.errors.product_id}
							>
								<select
									className={inputClass}
									value={form.data.product_id}
									onChange={(e) => {
										const product = products.find(
											(item) => item.id.toString() === e.target.value,
										);
										form.setData((data) => ({
											...data,
											product_id: e.target.value,
											unit_cost:
												product?.cost_price?.toString() ?? data.unit_cost,
										}));
									}}
								>
									{products.map((product) => (
										<option key={product.id} value={product.id}>
											{product.name}
										</option>
									))}
								</select>
							</FormField>

							<FormField
								label="Jumlah Masuk"
								required
								hint="Jumlah barang yang masuk ke gudang."
								error={form.errors.quantity}
							>
								<input
									className={inputClass}
									type="number"
									min="0.0001"
									step="0.0001"
									placeholder="10"
									value={form.data.quantity}
									onChange={(e) => form.setData("quantity", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Harga Modal per Unit"
								required
								hint="Nilai modal per satuan. Dipakai untuk nilai Persediaan dan HPP."
								error={form.errors.unit_cost}
							>
								<input
									className={inputClass}
									type="number"
									min="0"
									placeholder="50000"
									value={form.data.unit_cost}
									onChange={(e) => form.setData("unit_cost", e.target.value)}
								/>
							</FormField>

							<FormField
								label="Sumber Pembayaran"
								required
								hint="Pilih akun lawan jurnal stok masuk."
								error={form.errors.payment_account_code}
							>
								<select
									className={inputClass}
									value={form.data.payment_account_code}
									onChange={(e) =>
										form.setData("payment_account_code", e.target.value)
									}
								>
									<option value="1010">Bayar Kas</option>
									<option value="1020">Bayar Bank</option>
									<option value="2010">Hutang Dagang</option>
								</select>
							</FormField>

							<button
								disabled={form.processing}
								className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
							>
								Simpan Penerimaan Stok
							</button>
						</div>
					</form>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Riwayat Stok Masuk
						</h3>
						<div className="mt-5 space-y-3">
							{movements.map((movement) => (
								<div
									key={movement.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="font-semibold text-slate-950">
												{movement.product}
											</p>
											<p className="text-sm text-slate-500">
												{movement.movement_number} · {movement.warehouse}
											</p>
										</div>
										<p className="font-bold text-slate-950">
											{formatCurrency(movement.total_cost)}
										</p>
									</div>
									<p className="mt-3 text-sm text-slate-600">
										Qty {formatNumber(movement.quantity_in)} ×{" "}
										{formatCurrency(movement.unit_cost)}
									</p>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
