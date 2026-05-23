import type { PageProps } from "@/types";
import { formatCurrency, formatNumber } from "@/utils/format";
import { Head, Link } from "@inertiajs/react";

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
}: PageProps<{ tenant: { name: string }; sale: ReceiptSale }>) {
	return (
		<main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">
			<Head title={`Struk ${sale.sale_number}`} />
			<div className="mx-auto max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
				<div className="text-center">
					<h1 className="text-xl font-black">{tenant.name}</h1>
					<p className="text-sm text-slate-500">{sale.branch.name}</p>
					<p className="text-xs text-slate-400">{sale.branch.address}</p>
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
					onClick={() => window.print()}
					className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white shadow-lg"
				>
					Cetak
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
