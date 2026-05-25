import PrintPresetControls from "@/Components/PrintPresetControls";
import { usePrintPreset } from "@/hooks/usePrintPreset";
import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import type { PrintPreference } from "@/utils/printPresets";
import { Head, Link } from "@inertiajs/react";

interface PrintableInvoice {
	id: number;
	invoice_number: string;
	type: string;
	invoice_date: string | null;
	due_date: string | null;
	subtotal: number;
	tax_total: number;
	grand_total: number;
	paid_total: number;
	balance_due: number;
	status: string;
	notes: string | null;
	branch: { name: string | null; phone: string | null; address: string | null };
	contact: {
		name: string | null;
		email: string | null;
		phone: string | null;
		address: string | null;
	};
	items: Array<{
		description: string;
		account: string | null;
		product: string | null;
		quantity: number;
		unit_price: number;
		line_total: number;
		tax_total: number;
		tax: string | null;
	}>;
}

function invoiceTitle(type: string) {
	return type === "purchase" ? "Invoice Pembelian" : "Invoice Penjualan";
}

export default function InvoicePrint({
	tenant,
	invoice,
	printPreference,
}: PageProps<{
	tenant: {
		name: string;
		legal_name: string | null;
		tax_number: string | null;
		currency_code: string | null;
	};
	invoice: PrintableInvoice;
	printPreference: PrintPreference;
}>) {
	const print = usePrintPreset("standard-a4", printPreference);

	return (
		<main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">
			<Head title={`Cetak ${invoice.invoice_number}`} />
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
				onPrint={() => window.print()}
			/>

			<section className="print-sheet mx-auto max-w-5xl rounded-[2rem] bg-white p-8 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
				<header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-sm font-semibold text-cyan-700">
							{invoiceTitle(invoice.type)}
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
							{invoice.invoice_number}
						</h1>
						<p className="mt-2 text-sm text-slate-500">
							Tanggal {invoice.invoice_date ?? "-"}
							{invoice.due_date ? ` · Tempo ${invoice.due_date}` : ""}
						</p>
					</div>
					<div className="text-left sm:text-right">
						<h2 className="text-xl font-bold text-slate-950">
							{tenant.legal_name ?? tenant.name}
						</h2>
						<p className="text-sm text-slate-500">{invoice.branch.name}</p>
						<p className="text-sm text-slate-500">{invoice.branch.address}</p>
						{tenant.tax_number && (
							<p className="text-sm text-slate-500">
								NPWP: {tenant.tax_number}
							</p>
						)}
					</div>
				</header>

				<div className="grid gap-5 border-b border-slate-200 py-6 md:grid-cols-2">
					<div className="rounded-3xl bg-slate-50 p-5">
						<p className="text-xs font-bold uppercase tracking-wide text-slate-400">
							Ditagihkan kepada
						</p>
						<p className="mt-2 font-bold text-slate-950">
							{invoice.contact.name ?? "Tanpa kontak"}
						</p>
						<p className="text-sm text-slate-500">{invoice.contact.phone}</p>
						<p className="text-sm text-slate-500">{invoice.contact.email}</p>
						<p className="text-sm text-slate-500">{invoice.contact.address}</p>
					</div>
					<div className="rounded-3xl bg-slate-950 p-5 text-white">
						<p className="text-xs font-bold uppercase tracking-wide text-white/50">
							Total tagihan
						</p>
						<p className="mt-2 text-3xl font-black">
							{formatCurrency(invoice.grand_total)}
						</p>
						<p className="mt-1 text-sm text-white/60">
							Sisa {formatCurrency(invoice.balance_due)} · {invoice.status}
						</p>
					</div>
				</div>

				<div className="py-6">
					<table className="w-full border-collapse text-left text-sm">
						<thead>
							<tr className="border-b border-slate-200 text-slate-500">
								<th className="py-3 pr-3">Deskripsi</th>
								<th className="py-3 pr-3 text-right">Qty</th>
								<th className="py-3 pr-3 text-right">Harga</th>
								<th className="py-3 pr-3 text-right">Pajak</th>
								<th className="py-3 text-right">Total</th>
							</tr>
						</thead>
						<tbody>
							{invoice.items.map((item, index) => (
								<tr key={index} className="border-b border-slate-100">
									<td className="py-3 pr-3">
										<p className="font-semibold text-slate-950">
											{item.product ?? item.description}
										</p>
										<p className="text-xs text-slate-500 print-compact-hide">
											{item.account ?? "-"}
										</p>
									</td>
									<td className="py-3 pr-3 text-right">
										{formatNumber(item.quantity)}
									</td>
									<td className="py-3 pr-3 text-right">
										{formatCurrency(item.unit_price)}
									</td>
									<td className="py-3 pr-3 text-right">
										{formatCurrency(item.tax_total)}
									</td>
									<td className="py-3 text-right font-semibold">
										{formatCurrency(item.line_total + item.tax_total)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex justify-end">
					<div className="w-full max-w-sm space-y-2 text-sm">
						<div className="flex justify-between">
							<span>Subtotal</span>
							<span>{formatCurrency(invoice.subtotal)}</span>
						</div>
						<div className="flex justify-between">
							<span>Pajak</span>
							<span>{formatCurrency(invoice.tax_total)}</span>
						</div>
						<div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
							<span>Total</span>
							<span>{formatCurrency(invoice.grand_total)}</span>
						</div>
						<div className="flex justify-between">
							<span>Terbayar</span>
							<span>{formatCurrency(invoice.paid_total)}</span>
						</div>
						<div className="flex justify-between font-bold text-rose-600">
							<span>Sisa</span>
							<span>{formatCurrency(invoice.balance_due)}</span>
						</div>
					</div>
				</div>

				{invoice.notes && (
					<div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
						<p className="font-bold text-slate-950">Catatan</p>
						<p className="mt-1">{invoice.notes}</p>
					</div>
				)}
			</section>
			<div className="mx-auto mt-6 flex max-w-5xl gap-3 print:hidden">
				<button
					onClick={() => window.print()}
					className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg"
				>
					Cetak
				</button>
				<Link
					href={route("invoices.index")}
					className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-slate-700 shadow-lg"
				>
					Kembali Invoice
				</Link>
			</div>
		</main>
	);
}
