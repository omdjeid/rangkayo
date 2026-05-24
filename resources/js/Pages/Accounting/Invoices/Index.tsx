import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps, WarehouseOption } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, useForm } from "@inertiajs/react";

interface Contact {
	id: number;
	name: string;
	type: string;
}
interface Account {
	id: number;
	code: string;
	name: string;
	type: string;
}
interface Product {
	id: number;
	sku: string | null;
	name: string;
	cost_price: string | number;
}
interface Invoice {
	id: number;
	invoice_number: string;
	type: string;
	invoice_date: string;
	due_date: string | null;
	contact: string | null;
	grand_total: number;
	paid_total: number;
	balance_due: number;
	status: string;
}
const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

export default function InvoicesIndex({
	invoices,
	contacts,
	accounts,
	products,
	warehouses,
}: PageProps<{
	invoices: Invoice[];
	contacts: Contact[];
	accounts: Account[];
	products: Product[];
	warehouses: WarehouseOption[];
}>) {
	const invoiceForm = useForm({
		type: "sales",
		contact_id: contacts[0]?.id?.toString() ?? "",
		invoice_date: new Date().toISOString().slice(0, 10),
		due_date: "",
		notes: "",
		items: [
			{
				account_id:
					accounts.find((a) => a.code === "4010")?.id ?? accounts[0]?.id ?? "",
				product_id: "",
				warehouse_id: warehouses[0]?.id?.toString() ?? "",
				description: "Item invoice",
				quantity: "1",
				unit_price: "0",
			},
		],
	});
	const paymentForm = useForm({
		invoice_id: "",
		cash_account_id:
			accounts.find((a) => a.code === "1010")?.id?.toString() ?? "",
		payment_date: new Date().toISOString().slice(0, 10),
		amount: "0",
		notes: "",
	});
	const cashAccounts = accounts.filter((a) =>
		["1010", "1020"].includes(a.code),
	);
	function setItem(index: number, key: string, value: string | number) {
		invoiceForm.setData(
			"items",
			invoiceForm.data.items.map((item, i) =>
				i === index ? { ...item, [key]: value } : item,
			),
		);
	}
	function submitInvoice(e: React.FormEvent) {
		e.preventDefault();
		invoiceForm.post(route("invoices.store"), {
			preserveScroll: true,
			onSuccess: () => invoiceForm.reset("notes"),
		});
	}
	function addItem() {
		invoiceForm.setData("items", [
			...invoiceForm.data.items,
			{
				account_id:
					accounts.find((a) => a.code === "4010")?.id ?? accounts[0]?.id ?? "",
				product_id: "",
				warehouse_id: warehouses[0]?.id?.toString() ?? "",
				description: "Item invoice",
				quantity: "1",
				unit_price: "0",
			},
		]);
	}

	function removeItem(index: number) {
		if (invoiceForm.data.items.length <= 1) return;

		invoiceForm.setData(
			"items",
			invoiceForm.data.items.filter((_, i) => i !== index),
		);
	}

	function submitPayment(e: React.FormEvent) {
		e.preventDefault();
		paymentForm.post(route("invoice-payments.store"), {
			preserveScroll: true,
			onSuccess: () => paymentForm.reset("invoice_id", "amount", "notes"),
		});
	}
	return (
		<AuthenticatedLayout
			header={
				<div>
					<p className="text-sm font-medium text-slate-500">Akuntansi</p>
					<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
						Invoice Piutang/Hutang
					</h2>
				</div>
			}
		>
			<Head title="Invoice" />
			<div className="min-h-[calc(100vh-9rem)] bg-gradient-to-b from-slate-50 to-cyan-50/50 py-8">
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.25fr] lg:px-8">
					<div className="space-y-6">
						<form
							onSubmit={submitInvoice}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Buat Invoice
							</h3>
							<div className="mt-5 space-y-4">
								<FormField label="Tipe" required>
									<select
										className={inputClass}
										value={invoiceForm.data.type}
										onChange={(e) =>
											invoiceForm.setData("type", e.target.value)
										}
									>
										<option value="sales">Invoice Penjualan / Piutang</option>
										<option value="purchase">Invoice Pembelian / Hutang</option>
									</select>
								</FormField>
								<FormField label="Kontak">
									<select
										className={inputClass}
										value={invoiceForm.data.contact_id}
										onChange={(e) =>
											invoiceForm.setData("contact_id", e.target.value)
										}
									>
										<option value="">Tanpa kontak</option>
										{contacts.map((contact) => (
											<option key={contact.id} value={contact.id}>
												{contact.name} ({contact.type})
											</option>
										))}
									</select>
								</FormField>
								<div className="grid gap-3 md:grid-cols-2">
									<FormField label="Tanggal" required>
										<input
											className={inputClass}
											type="date"
											value={invoiceForm.data.invoice_date}
											onChange={(e) =>
												invoiceForm.setData("invoice_date", e.target.value)
											}
										/>
									</FormField>
									<FormField label="Jatuh Tempo">
										<input
											className={inputClass}
											type="date"
											value={invoiceForm.data.due_date}
											onChange={(e) =>
												invoiceForm.setData("due_date", e.target.value)
											}
										/>
									</FormField>
								</div>
								{invoiceForm.data.items.map((item, index) => (
									<div
										key={index}
										className="rounded-3xl border border-slate-200 bg-white/75 p-4"
									>
										<div className="mb-3 flex items-center justify-between gap-3">
											<p className="text-sm font-bold text-slate-700">
												Baris #{index + 1}
											</p>
											{invoiceForm.data.items.length > 1 && (
												<button
													type="button"
													className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
													onClick={() => removeItem(index)}
												>
													Hapus
												</button>
											)}
										</div>
										<FormField label="Akun Pendapatan/Beban" required>
											<select
												className={inputClass}
												value={item.account_id}
												onChange={(e) =>
													setItem(index, "account_id", Number(e.target.value))
												}
											>
												{accounts.map((account) => (
													<option key={account.id} value={account.id}>
														{account.code} - {account.name}
													</option>
												))}
											</select>
										</FormField>
										<div className="mt-3 grid gap-3 md:grid-cols-2">
											<FormField label="Produk stok">
												<select
													className={inputClass}
													value={item.product_id}
													onChange={(e) => {
														const product = products.find(
															(option) =>
																option.id.toString() === e.target.value,
														);
														setItem(index, "product_id", e.target.value);
														if (product) {
															setItem(index, "description", product.name);
															setItem(
																index,
																"unit_price",
																product.cost_price.toString(),
															);
														}
													}}
												>
													<option value="">Non-stok / jasa</option>
													{products.map((product) => (
														<option key={product.id} value={product.id}>
															{product.sku ? `${product.sku} · ` : ""}
															{product.name}
														</option>
													))}
												</select>
											</FormField>
											<FormField
												label="Gudang item"
												hint="Wajib untuk pembelian produk stok."
											>
												<select
													className={inputClass}
													value={item.warehouse_id}
													onChange={(e) =>
														setItem(index, "warehouse_id", e.target.value)
													}
												>
													<option value="">Pilih gudang</option>
													{warehouses.map((option) => (
														<option key={option.id} value={option.id}>
															{option.branch_name
																? `${option.branch_name} · `
																: ""}
															{option.name}
															{option.is_default ? " · default" : ""}
														</option>
													))}
												</select>
											</FormField>
										</div>
										<div className="mt-3 grid gap-3 md:grid-cols-3">
											<FormField label="Deskripsi">
												<input
													className={inputClass}
													value={item.description}
													onChange={(e) =>
														setItem(index, "description", e.target.value)
													}
												/>
											</FormField>
											<FormField label="Qty">
												<input
													className={inputClass}
													type="number"
													min="0.0001"
													value={item.quantity}
													onChange={(e) =>
														setItem(index, "quantity", e.target.value)
													}
												/>
											</FormField>
											<FormField label="Harga">
												<input
													className={inputClass}
													type="number"
													min="0"
													value={item.unit_price}
													onChange={(e) =>
														setItem(index, "unit_price", e.target.value)
													}
												/>
											</FormField>
										</div>
									</div>
								))}
								<button
									type="button"
									className="w-full rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-3 font-bold text-cyan-700 shadow-sm transition hover:bg-cyan-100"
									onClick={addItem}
								>
									Tambah Baris Invoice
								</button>
								<button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300">
									Simpan Invoice
								</button>
							</div>
						</form>
						<form
							onSubmit={submitPayment}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Pembayaran Invoice
							</h3>
							<div className="mt-5 space-y-4">
								<FormField label="Invoice" required>
									<select
										className={inputClass}
										value={paymentForm.data.invoice_id}
										onChange={(e) =>
											paymentForm.setData("invoice_id", e.target.value)
										}
									>
										<option value="">Pilih invoice</option>
										{invoices
											.filter((i) => i.balance_due > 0)
											.map((invoice) => (
												<option key={invoice.id} value={invoice.id}>
													{invoice.invoice_number} - sisa{" "}
													{formatCurrency(invoice.balance_due)}
												</option>
											))}
									</select>
								</FormField>
								<FormField label="Akun Kas/Bank">
									<select
										className={inputClass}
										value={paymentForm.data.cash_account_id}
										onChange={(e) =>
											paymentForm.setData("cash_account_id", e.target.value)
										}
									>
										{cashAccounts.map((a) => (
											<option key={a.id} value={a.id}>
												{a.code} - {a.name}
											</option>
										))}
									</select>
								</FormField>
								<div className="grid gap-3 md:grid-cols-2">
									<FormField label="Tanggal">
										<input
											className={inputClass}
											type="date"
											value={paymentForm.data.payment_date}
											onChange={(e) =>
												paymentForm.setData("payment_date", e.target.value)
											}
										/>
									</FormField>
									<FormField label="Nominal">
										<input
											className={inputClass}
											type="number"
											min="0"
											value={paymentForm.data.amount}
											onChange={(e) =>
												paymentForm.setData("amount", e.target.value)
											}
										/>
									</FormField>
								</div>
								<button className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200">
									Catat Pembayaran
								</button>
							</div>
						</form>
					</div>
					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<h3 className="text-lg font-semibold text-slate-950">
							Daftar Invoice
						</h3>
						<div className="mt-5 space-y-3">
							{invoices.map((invoice) => (
								<div
									key={invoice.id}
									className="rounded-3xl border border-slate-200 bg-white/75 p-5"
								>
									<div className="flex justify-between gap-3">
										<div>
											<p className="font-semibold text-slate-950">
												{invoice.invoice_number}
											</p>
											<p className="text-sm text-slate-500">
												{invoice.type} · {invoice.contact ?? "-"} ·{" "}
												{invoice.status}
											</p>
										</div>
										<div className="text-right">
											<p className="font-bold text-slate-950">
												{formatCurrency(invoice.grand_total)}
											</p>
											<p className="text-sm text-rose-600">
												Sisa {formatCurrency(invoice.balance_due)}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
