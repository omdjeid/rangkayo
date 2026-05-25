import FormField from "@/Components/FormField";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import type { PageProps, WarehouseOption } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";

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

interface TaxRate {
	id: number;
	name: string;
	code: string;
	rate: string | number;
	is_default: boolean;
}

interface Invoice {
	id: number;
	invoice_number: string;
	type: string;
	invoice_date: string;
	due_date: string | null;
	contact: string | null;
	subtotal: number;
	tax_total: number;
	grand_total: number;
	paid_total: number;
	balance_due: number;
	status: string;
}

type InvoiceItemForm = {
	account_id: number | string;
	product_id: string;
	warehouse_id: string;
	tax_rate_id: string;
	description: string;
	quantity: string;
	unit_price: string;
};

const inputClass =
	"w-full rounded-2xl border-slate-200 bg-white/80 shadow-sm focus:border-cyan-400 focus:ring-cyan-400";

function invoiceTypeLabel(type: string) {
	return type === "purchase" ? "Pembelian" : "Penjualan";
}

function statusClass(status: string) {
	if (status === "paid") return "bg-emerald-50 text-emerald-700";
	if (status === "partial") return "bg-cyan-50 text-cyan-700";

	return "bg-amber-50 text-amber-700";
}

function invoiceAccounts(type: string, accounts: Account[]) {
	const allowedTypes = type === "sales" ? ["revenue"] : ["expense", "asset"];

	return accounts.filter(
		(account) =>
			allowedTypes.includes(account.type) &&
			!account.code.startsWith("10") &&
			!account.code.startsWith("20"),
	);
}

function firstInvoiceAccountId(type: string, accounts: Account[]) {
	return invoiceAccounts(type, accounts)[0]?.id ?? "";
}

export default function InvoicesIndex({
	invoices,
	contacts,
	accounts,
	products,
	warehouses,
	taxRates,
}: PageProps<{
	invoices: Invoice[];
	contacts: Contact[];
	accounts: Account[];
	products: Product[];
	warehouses: WarehouseOption[];
	taxRates: TaxRate[];
}>) {
	const defaultTaxRateId =
		taxRates.find((rate) => rate.is_default)?.id?.toString() ?? "";
	const defaultItem: InvoiceItemForm = {
		account_id: firstInvoiceAccountId("sales", accounts),
		product_id: "",
		warehouse_id: warehouses[0]?.id?.toString() ?? "",
		tax_rate_id: defaultTaxRateId,
		description: "Item invoice",
		quantity: "1",
		unit_price: "0",
	};
	const invoiceForm = useForm({
		type: "sales",
		contact_id: contacts[0]?.id?.toString() ?? "",
		invoice_date: new Date().toISOString().slice(0, 10),
		due_date: "",
		notes: "",
		items: [defaultItem],
	});
	const paymentForm = useForm({
		invoice_id: "",
		cash_account_id:
			accounts.find((account) => account.code === "1010")?.id?.toString() ?? "",
		payment_date: new Date().toISOString().slice(0, 10),
		amount: "0",
		notes: "",
	});
	const cashAccounts = accounts.filter((account) =>
		["1010", "1020"].includes(account.code),
	);
	const itemAccountOptions = invoiceAccounts(invoiceForm.data.type, accounts);
	const invoiceSubtotal = invoiceForm.data.items.reduce(
		(total, item) =>
			total + Number(item.quantity || 0) * Number(item.unit_price || 0),
		0,
	);
	const invoiceTaxTotal = invoiceForm.data.items.reduce((total, item) => {
		const taxRate = taxRates.find(
			(rate) => rate.id.toString() === item.tax_rate_id,
		);

		if (!taxRate) return total;

		return (
			total +
			Number(item.quantity || 0) *
				Number(item.unit_price || 0) *
				(Number(taxRate.rate || 0) / 100)
		);
	}, 0);
	const selectedInvoice = invoices.find(
		(invoice) => invoice.id.toString() === paymentForm.data.invoice_id,
	);

	function setItem(
		index: number,
		key: keyof InvoiceItemForm,
		value: string | number,
	) {
		invoiceForm.setData(
			"items",
			invoiceForm.data.items.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [key]: value } : item,
			),
		);
	}

	function submitInvoice(event: FormEvent) {
		event.preventDefault();
		invoiceForm.post(route("invoices.store"), {
			preserveScroll: true,
			onSuccess: () => invoiceForm.reset("notes"),
		});
	}

	function addItem() {
		invoiceForm.setData("items", [
			...invoiceForm.data.items,
			{
				...defaultItem,
				account_id: firstInvoiceAccountId(invoiceForm.data.type, accounts),
			},
		]);
	}

	function removeItem(index: number) {
		if (invoiceForm.data.items.length <= 1) return;

		invoiceForm.setData(
			"items",
			invoiceForm.data.items.filter((_, itemIndex) => itemIndex !== index),
		);
	}

	function submitPayment(event: FormEvent) {
		event.preventDefault();
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
				<div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.35fr] lg:px-8">
					<div className="space-y-6">
						<form
							onSubmit={submitInvoice}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<div className="flex items-start justify-between gap-4">
								<div>
									<h3 className="text-lg font-semibold text-slate-950">
										Buat Invoice
									</h3>
									<p className="mt-1 text-sm text-slate-500">
										Pajak per baris akan otomatis masuk ke subtotal, total
										invoice, dan jurnal hutang pajak.
									</p>
								</div>
								<span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
									Tax ready
								</span>
							</div>
							<div className="mt-5 space-y-4">
								<FormField
									label="Tipe"
									required
									error={invoiceForm.errors.type}
								>
									<select
										className={inputClass}
										value={invoiceForm.data.type}
										onChange={(event) => {
											const type = event.target.value;
											invoiceForm.setData((data) => ({
												...data,
												type,
												items: data.items.map((item) => ({
													...item,
													account_id: firstInvoiceAccountId(type, accounts),
												})),
											}));
										}}
									>
										<option value="sales">Invoice Penjualan / Piutang</option>
										<option value="purchase">Invoice Pembelian / Hutang</option>
									</select>
								</FormField>
								<FormField label="Kontak" error={invoiceForm.errors.contact_id}>
									<select
										className={inputClass}
										value={invoiceForm.data.contact_id}
										onChange={(event) =>
											invoiceForm.setData("contact_id", event.target.value)
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
									<FormField
										label="Tanggal"
										required
										error={invoiceForm.errors.invoice_date}
									>
										<input
											className={inputClass}
											type="date"
											value={invoiceForm.data.invoice_date}
											onChange={(event) =>
												invoiceForm.setData("invoice_date", event.target.value)
											}
										/>
									</FormField>
									<FormField
										label="Jatuh Tempo"
										error={invoiceForm.errors.due_date}
									>
										<input
											className={inputClass}
											type="date"
											value={invoiceForm.data.due_date}
											onChange={(event) =>
												invoiceForm.setData("due_date", event.target.value)
											}
										/>
									</FormField>
								</div>
								{invoiceForm.data.items.map((item, index) => (
									<div
										key={index}
										className="rounded-3xl border border-white/80 bg-white/70 p-4 shadow-sm shadow-slate-200/70"
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
										<FormField
											label="Akun Pendapatan/Beban"
											required
											error={invoiceForm.errors[`items.${index}.account_id`]}
										>
											<select
												className={inputClass}
												value={item.account_id}
												onChange={(event) =>
													setItem(
														index,
														"account_id",
														Number(event.target.value),
													)
												}
											>
												{itemAccountOptions.map((account) => (
													<option key={account.id} value={account.id}>
														{account.code} - {account.name}
													</option>
												))}
											</select>
										</FormField>
										<div className="mt-3 grid gap-3 md:grid-cols-3">
											<FormField label="Produk stok">
												<select
													className={inputClass}
													value={item.product_id}
													onChange={(event) => {
														const product = products.find(
															(option) =>
																option.id.toString() === event.target.value,
														);
														setItem(index, "product_id", event.target.value);
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
												error={
													invoiceForm.errors[`items.${index}.warehouse_id`]
												}
											>
												<select
													className={inputClass}
													value={item.warehouse_id}
													onChange={(event) =>
														setItem(index, "warehouse_id", event.target.value)
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
											<FormField
												label="Pajak"
												error={invoiceForm.errors[`items.${index}.tax_rate_id`]}
											>
												<select
													className={inputClass}
													value={item.tax_rate_id}
													onChange={(event) =>
														setItem(index, "tax_rate_id", event.target.value)
													}
												>
													<option value="">Tanpa pajak</option>
													{taxRates.map((taxRate) => (
														<option key={taxRate.id} value={taxRate.id}>
															{taxRate.name} ({Number(taxRate.rate)}%)
														</option>
													))}
												</select>
											</FormField>
										</div>
										<div className="mt-3 grid gap-3 md:grid-cols-3">
											<FormField
												label="Deskripsi"
												error={invoiceForm.errors[`items.${index}.description`]}
											>
												<input
													className={inputClass}
													value={item.description}
													onChange={(event) =>
														setItem(index, "description", event.target.value)
													}
												/>
											</FormField>
											<FormField
												label="Qty"
												required
												error={invoiceForm.errors[`items.${index}.quantity`]}
											>
												<input
													className={inputClass}
													type="number"
													min="0.0001"
													step="0.0001"
													value={item.quantity}
													onChange={(event) =>
														setItem(index, "quantity", event.target.value)
													}
												/>
											</FormField>
											<FormField
												label="Harga"
												required
												error={invoiceForm.errors[`items.${index}.unit_price`]}
											>
												<input
													className={inputClass}
													type="number"
													min="0"
													value={item.unit_price}
													onChange={(event) =>
														setItem(index, "unit_price", event.target.value)
													}
												/>
											</FormField>
										</div>
										<div className="mt-3 rounded-2xl bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
											Subtotal baris:{" "}
											{formatCurrency(
												Number(item.quantity || 0) *
													Number(item.unit_price || 0),
											)}
										</div>
									</div>
								))}
								<button
									type="button"
									onClick={addItem}
									className="w-full rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/70 px-5 py-3 text-sm font-bold text-cyan-700"
								>
									+ Tambah Baris
								</button>
								<FormField label="Catatan" error={invoiceForm.errors.notes}>
									<textarea
										className={inputClass}
										rows={3}
										value={invoiceForm.data.notes}
										onChange={(event) =>
											invoiceForm.setData("notes", event.target.value)
										}
									/>
								</FormField>
								<div className="rounded-3xl border border-white/80 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg shadow-slate-300">
									<div className="flex items-center justify-between text-sm text-white/70">
										<span>Subtotal</span>
										<span>{formatCurrency(invoiceSubtotal)}</span>
									</div>
									<div className="mt-2 flex items-center justify-between text-sm text-cyan-100">
										<span>Pajak</span>
										<span>{formatCurrency(invoiceTaxTotal)}</span>
									</div>
									<div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-lg font-bold">
										<span>Total</span>
										<span>
											{formatCurrency(invoiceSubtotal + invoiceTaxTotal)}
										</span>
									</div>
								</div>
								<button
									disabled={invoiceForm.processing}
									className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-300 disabled:opacity-60"
								>
									Simpan Invoice + Jurnal
								</button>
							</div>
						</form>

						<form
							onSubmit={submitPayment}
							className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl"
						>
							<h3 className="text-lg font-semibold text-slate-950">
								Catat Pembayaran
							</h3>
							<p className="mt-1 text-sm text-slate-500">
								Pembayaran akan menutup piutang/hutang sesuai jenis invoice.
							</p>
							<div className="mt-5 space-y-4">
								<FormField
									label="Invoice"
									required
									error={paymentForm.errors.invoice_id}
								>
									<select
										className={inputClass}
										value={paymentForm.data.invoice_id}
										onChange={(event) => {
											const invoice = invoices.find(
												(option) => option.id.toString() === event.target.value,
											);
											paymentForm.setData((data) => ({
												...data,
												invoice_id: event.target.value,
												amount: invoice?.balance_due?.toString() ?? data.amount,
											}));
										}}
									>
										<option value="">Pilih invoice terbuka</option>
										{invoices
											.filter((invoice) => invoice.balance_due > 0)
											.map((invoice) => (
												<option key={invoice.id} value={invoice.id}>
													{invoice.invoice_number} ·{" "}
													{invoiceTypeLabel(invoice.type)} ·{" "}
													{formatCurrency(invoice.balance_due)}
												</option>
											))}
									</select>
								</FormField>
								<div className="grid gap-3 md:grid-cols-2">
									<FormField
										label="Akun Kas/Bank"
										required
										error={paymentForm.errors.cash_account_id}
									>
										<select
											className={inputClass}
											value={paymentForm.data.cash_account_id}
											onChange={(event) =>
												paymentForm.setData(
													"cash_account_id",
													event.target.value,
												)
											}
										>
											{cashAccounts.map((account) => (
												<option key={account.id} value={account.id}>
													{account.code} - {account.name}
												</option>
											))}
										</select>
									</FormField>
									<FormField
										label="Tanggal Bayar"
										required
										error={paymentForm.errors.payment_date}
									>
										<input
											className={inputClass}
											type="date"
											value={paymentForm.data.payment_date}
											onChange={(event) =>
												paymentForm.setData("payment_date", event.target.value)
											}
										/>
									</FormField>
								</div>
								<FormField
									label="Nominal"
									required
									hint={
										selectedInvoice
											? `Sisa invoice: ${formatCurrency(selectedInvoice.balance_due)}`
											: "Pilih invoice untuk mengisi nominal otomatis."
									}
									error={paymentForm.errors.amount}
								>
									<input
										className={inputClass}
										type="number"
										min="0.01"
										value={paymentForm.data.amount}
										onChange={(event) =>
											paymentForm.setData("amount", event.target.value)
										}
									/>
								</FormField>
								<FormField label="Catatan" error={paymentForm.errors.notes}>
									<textarea
										className={inputClass}
										rows={2}
										value={paymentForm.data.notes}
										onChange={(event) =>
											paymentForm.setData("notes", event.target.value)
										}
									/>
								</FormField>
								<button
									disabled={paymentForm.processing}
									className="w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-200 disabled:opacity-60"
								>
									Simpan Pembayaran
								</button>
							</div>
						</form>
					</div>

					<section className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-2xl">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h3 className="text-lg font-semibold text-slate-950">
									Daftar Invoice
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									Pantau piutang, hutang, pajak invoice, dan sisa tagihan.
								</p>
							</div>
							<div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-300">
								{formatCurrency(
									invoices.reduce(
										(total, invoice) => total + invoice.balance_due,
										0,
									),
								)}
								<p className="text-xs font-semibold text-white/60">
									Total sisa
								</p>
							</div>
						</div>
						<div className="mt-5 space-y-3">
							{invoices.map((invoice) => (
								<article
									key={invoice.id}
									className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-sm shadow-slate-200/70"
								>
									<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold text-slate-950">
													{invoice.invoice_number}
												</p>
												<span
													className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(invoice.status)}`}
												>
													{invoice.status}
												</span>
											</div>
											<p className="mt-1 text-sm text-slate-500">
												{invoiceTypeLabel(invoice.type)} ·{" "}
												{invoice.invoice_date} ·{" "}
												{invoice.contact ?? "Tanpa kontak"}
												{invoice.due_date ? ` · tempo ${invoice.due_date}` : ""}
											</p>
											<div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
												<p>Subtotal {formatCurrency(invoice.subtotal)}</p>
												<p>Pajak {formatCurrency(invoice.tax_total)}</p>
												<p>Terbayar {formatCurrency(invoice.paid_total)}</p>
											</div>
										</div>
										<div className="text-left md:text-right">
											<p className="text-lg font-bold text-slate-950">
												{formatCurrency(invoice.grand_total)}
											</p>
											<p className="mt-1 text-sm font-semibold text-rose-600">
												Sisa {formatCurrency(invoice.balance_due)}
											</p>
											<Link
												href={route("invoices.print", invoice.id)}
												className="mt-3 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-200"
											>
												Cetak Invoice
											</Link>
										</div>
									</div>
								</article>
							))}
							{invoices.length === 0 && (
								<p className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-500">
									Belum ada invoice.
								</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
