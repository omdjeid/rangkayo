const SERIAL_STORAGE_KEY = "akutansia.printer.serial.port";
const DEFAULT_BAUD_RATE = 9600;

let serialPort: SerialPort | null = null;
let serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

export function serialSupported(): boolean {
	return Boolean(navigator.serial!);
}

export function savedSerialPrinter(): { name: string } | null {
	try {
		const data = localStorage.getItem(SERIAL_STORAGE_KEY);
		return data ? JSON.parse(data) : null;
	} catch {
		return null;
	}
}

function saveSerialPrinter(name: string) {
	localStorage.setItem(SERIAL_STORAGE_KEY, JSON.stringify({ name, saved_at: Date.now() }));
}

export async function connectSerialPrinter(): Promise<boolean> {
	if (!serialSupported()) throw new Error("Web Serial tidak didukung browser ini");

	try {
		serialPort = await navigator.serial!.requestPort();
		await serialPort.open({ baudRate: DEFAULT_BAUD_RATE });
		const writer = serialPort.writable?.getWriter();
		if (!writer) throw new Error("Tidak bisa membuka port serial");
		serialWriter = writer;
		saveSerialPrinter("USB Serial Printer");
		return true;
	} catch (err) {
		serialPort = null;
		serialWriter = null;
		throw err;
	}
}

export async function autoConnectSerialPrinter(): Promise<boolean> {
	if (!serialSupported() || !savedSerialPrinter()) return false;
	try {
		const ports = await navigator.serial!.getPorts();
		if (ports.length === 0) return false;
		serialPort = ports[0];
		await serialPort.open({ baudRate: DEFAULT_BAUD_RATE });
		const writer = serialPort.writable?.getWriter();
		if (!writer) return false;
		serialWriter = writer;
		return true;
	} catch {
		serialPort = null;
		serialWriter = null;
		return false;
	}
}

export async function disconnectSerialPrinter() {
	try {
		if (serialWriter) {
			await serialWriter.close();
			serialWriter = null;
		}
		if (serialPort) {
			await serialPort.close();
			serialPort = null;
		}
	} catch {
		serialPort = null;
		serialWriter = null;
	}
}

export function serialConnected(): boolean {
	return serialPort !== null && serialWriter !== null;
}

async function writeSerial(data: Uint8Array) {
	if (!serialWriter) throw new Error("Printer serial belum terhubung");
	const CHUNK_SIZE = 256;
	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);
		await serialWriter.write(chunk);
		await new Promise((r) => setTimeout(r, 10));
	}
}

// ESC/POS commands
const ESC = 0x1b;
const GS = 0x1d;

function escInit(): Uint8Array { return new Uint8Array([ESC, 0x40]); }
function escCenter(): Uint8Array { return new Uint8Array([ESC, 0x61, 0x01]); }
function escLeft(): Uint8Array { return new Uint8Array([ESC, 0x61, 0x00]); }
function escBoldOn(): Uint8Array { return new Uint8Array([ESC, 0x45, 0x01]); }
function escBoldOff(): Uint8Array { return new Uint8Array([ESC, 0x45, 0x00]); }
function escDoubleHeight(): Uint8Array { return new Uint8Array([ESC, 0x21, 0x10]); }
function escNormal(): Uint8Array { return new Uint8Array([ESC, 0x21, 0x00]); }
function escCut(): Uint8Array { return new Uint8Array([GS, 0x56, 0x00]); }
function escFeed(lines: number): Uint8Array { return new Uint8Array([ESC, 0x64, lines]); }

function textToBytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function line(text: string): Uint8Array {
	return textToBytes(text + "\n");
}

function separator(width: number): Uint8Array {
	return line("-".repeat(width));
}

function formatMoney(value: number): string {
	return "Rp" + value.toLocaleString("id-ID");
}

export interface SerialReceiptPayload {
	tenant_name: string;
	sale_number: string;
	sold_at: string;
	payment_method: string;
	subtotal: number;
	grand_total: number;
	paid_total: number;
	change_total: number;
	cashier: string | null;
	branch: { name: string | null; phone: string | null; address: string | null } | null;
	items: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }>;
}

export async function printThermalSerial(payload: SerialReceiptPayload, paperWidth = 32) {
	const parts: Uint8Array[] = [];

	parts.push(escInit());
	parts.push(escCenter());
	parts.push(escBoldOn());
	parts.push(line(payload.tenant_name));
	parts.push(escBoldOff());
	if (payload.branch?.name) parts.push(line(payload.branch.name));
	if (payload.branch?.address) parts.push(line(payload.branch.address));
	parts.push(escLeft());
	parts.push(separator(paperWidth));
	parts.push(line("No: " + payload.sale_number));
	parts.push(line("Tgl: " + payload.sold_at));
	if (payload.cashier) parts.push(line("Kasir: " + payload.cashier));
	parts.push(separator(paperWidth));

	for (const item of payload.items) {
		parts.push(line(item.product_name));
		const qtyPrice = `${item.quantity} x ${formatMoney(item.unit_price)}`;
		const total = formatMoney(item.line_total);
		const pad = paperWidth - qtyPrice.length - total.length;
		parts.push(line(qtyPrice + " ".repeat(Math.max(1, pad)) + total));
	}

	parts.push(separator(paperWidth));
	parts.push(escBoldOn());
	const totalLabel = "TOTAL";
	const totalVal = formatMoney(payload.grand_total);
	const padT = paperWidth - totalLabel.length - totalVal.length;
	parts.push(line(totalLabel + " ".repeat(Math.max(1, padT)) + totalVal));
	parts.push(escBoldOff());

	const paidLabel = "Bayar";
	const paidVal = formatMoney(payload.paid_total);
	const padP = paperWidth - paidLabel.length - paidVal.length;
	parts.push(line(paidLabel + " ".repeat(Math.max(1, padP)) + paidVal));

	const changeLabel = "Kembali";
	const changeVal = formatMoney(payload.change_total);
	const padC = paperWidth - changeLabel.length - changeVal.length;
	parts.push(line(changeLabel + " ".repeat(Math.max(1, padC)) + changeVal));

	parts.push(line("Metode: " + payload.payment_method));
	parts.push(escCenter());
	parts.push(escFeed(2));
	parts.push(line("Terima kasih"));
	parts.push(escFeed(4));
	parts.push(escCut());

	const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}

	await writeSerial(result);
}

export async function printDotMatrixSerial(payload: SerialReceiptPayload, paperWidth = 80) {
	const parts: Uint8Array[] = [];

	parts.push(escInit());
	parts.push(escCenter());
	parts.push(escBoldOn());
	parts.push(line(payload.tenant_name));
	parts.push(escBoldOff());
	if (payload.branch?.name) parts.push(line(payload.branch.name));
	if (payload.branch?.address) parts.push(line(payload.branch.address));
	parts.push(escLeft());
	parts.push(separator(paperWidth));
	parts.push(line("No: " + payload.sale_number + "    Tgl: " + payload.sold_at));
	if (payload.cashier) parts.push(line("Kasir: " + payload.cashier));
	parts.push(separator(paperWidth));

	// Header
	const hdr = "Produk".padEnd(30) + "Qty".padStart(6) + "Harga".padStart(12) + "Total".padStart(12);
	parts.push(escBoldOn());
	parts.push(line(hdr));
	parts.push(escBoldOff());
	parts.push(separator(paperWidth));

	for (const item of payload.items) {
		const name = item.product_name.substring(0, 30).padEnd(30);
		const qty = String(item.quantity).padStart(6);
		const price = formatMoney(item.unit_price).padStart(12);
		const total = formatMoney(item.line_total).padStart(12);
		parts.push(line(name + qty + price + total));
	}

	parts.push(separator(paperWidth));
	parts.push(escBoldOn());
	parts.push(line("TOTAL".padEnd(30) + formatMoney(payload.grand_total).padStart(paperWidth - 30)));
	parts.push(escBoldOff());
	parts.push(line("Bayar".padEnd(30) + formatMoney(payload.paid_total).padStart(paperWidth - 30)));
	parts.push(line("Kembali".padEnd(30) + formatMoney(payload.change_total).padStart(paperWidth - 30)));
	parts.push(line("Metode: " + payload.payment_method));
	parts.push(escCenter());
	parts.push(escFeed(2));
	parts.push(line("Terima kasih"));
	parts.push(escFeed(3));

	const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}

	await writeSerial(result);
}

export async function testSerialPrinter() {
	const testReceipt: SerialReceiptPayload = {
		tenant_name: "RangKayo Test Print",
		sale_number: "TEST-001",
		sold_at: new Date().toLocaleString("id-ID"),
		payment_method: "cash",
		subtotal: 10000,
		grand_total: 10000,
		paid_total: 10000,
		change_total: 0,
		cashier: "Kasir",
		branch: { name: "Cabang Test", phone: null, address: null },
		items: [{ product_name: "Produk Test", quantity: 1, unit_price: 10000, line_total: 10000 }],
	};
	await printThermalSerial(testReceipt);
}
