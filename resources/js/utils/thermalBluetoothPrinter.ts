import type { PrintPreference } from "@/utils/printPresets";

export const BLUETOOTH_PRINTER_STORAGE_KEY =
	"rangkayo.printer.bluetooth.device";
export const LEGACY_BLUETOOTH_PRINTER_STORAGE_KEY = "pos_printer";

const LEGACY_THERMAL_BLUETOOTH_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const LEGACY_THERMAL_BLUETOOTH_CHARACTERISTIC =
	"00002af1-0000-1000-8000-00805f9b34fb";
const THERMAL_BLUETOOTH_SERVICES = [
	LEGACY_THERMAL_BLUETOOTH_SERVICE,
	"0000ffe0-0000-1000-8000-00805f9b34fb",
	"0000ff00-0000-1000-8000-00805f9b34fb",
	"49535343-fe7d-4ae5-8fa9-9fafd205e455",
];
const LEGACY_THERMAL_BLUETOOTH_FILTERS = [
	{ services: [LEGACY_THERMAL_BLUETOOTH_SERVICE] },
	{ namePrefix: "RPP" },
	{ namePrefix: "BlueTooth" },
	{ namePrefix: "Printer" },
	{ namePrefix: "MTP" },
	{ namePrefix: "POS" },
];
const BLUETOOTH_WRITE_CHUNK_SIZE = 180;
const BLUETOOTH_RECONNECT_ATTEMPTS = 5;
const BLUETOOTH_RECONNECT_DELAY_MS = 700;

type BluetoothLikeDevice = BluetoothDevice & {
	id?: string;
	name?: string;
};

type SavedBluetoothPrinter = {
	id: string;
	name: string;
	saved_at: string | number | null;
};

let bluetoothDevice: BluetoothLikeDevice | null = null;
let bluetoothServer: BluetoothRemoteGATTServer | null = null;
let bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let reconnectInFlight: Promise<boolean> | null = null;

function delay(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function bluetoothSupported() {
	return Boolean(navigator.bluetooth);
}

export function bluetoothConnected() {
	return Boolean(bluetoothCharacteristic && bluetoothServer?.connected);
}

export function canAutoReconnectBluetooth() {
	return Boolean(navigator.bluetooth?.getDevices);
}

function printerSavedAt(value: string | number | null | undefined) {
	if (typeof value === "number") return value;

	const timestamp = Date.parse(String(value ?? ""));

	return Number.isFinite(timestamp) ? timestamp : 0;
}

export function savedBluetoothPrinters(): SavedBluetoothPrinter[] {
	const candidates: SavedBluetoothPrinter[] = [];

	try {
		const current = JSON.parse(
			window.localStorage.getItem(BLUETOOTH_PRINTER_STORAGE_KEY) || "null",
		);
		if (current?.id || current?.name) {
			candidates.push({
				id: current.id || "",
				name: current.name || "Bluetooth Printer",
				saved_at: current.saved_at || null,
			});
		}
	} catch (_error) {
		// Ignore malformed storage and keep checking the legacy key.
	}

	try {
		const legacy = JSON.parse(
			window.localStorage.getItem(LEGACY_BLUETOOTH_PRINTER_STORAGE_KEY) ||
				"null",
		);
		if (legacy?.deviceId || legacy?.id || legacy?.deviceName || legacy?.name) {
			candidates.push({
				id: legacy.deviceId || legacy.id || "",
				name: legacy.deviceName || legacy.name || "Bluetooth Printer",
				saved_at: legacy.saved_at || legacy.connectedAt || null,
			});
		}
	} catch (_error) {
		// Ignore malformed legacy storage too.
	}

	return candidates
		.filter((printer) => printer.id || printer.name)
		.sort((a, b) => printerSavedAt(b.saved_at) - printerSavedAt(a.saved_at));
}

export function savedBluetoothPrinter() {
	return savedBluetoothPrinters()[0] ?? null;
}

function saveBluetoothPrinter(device: BluetoothLikeDevice) {
	const name = device.name || "Bluetooth Printer";
	const savedAt = new Date().toISOString();
	const currentPayload = {
		id: device.id || "",
		name,
		saved_at: savedAt,
	};
	const legacyPayload = {
		deviceId: device.id || "",
		deviceName: name,
		connectedAt: Date.now(),
	};

	try {
		window.localStorage.setItem(
			BLUETOOTH_PRINTER_STORAGE_KEY,
			JSON.stringify(currentPayload),
		);
		window.localStorage.setItem(
			LEGACY_BLUETOOTH_PRINTER_STORAGE_KEY,
			JSON.stringify(legacyPayload),
		);
	} catch (_error) {
		// Ignore storage failure; the current connection can still be used.
	}
}

async function reconnectSavedBluetoothDevice() {
	if (!navigator.bluetooth?.getDevices) return null;

	const savedPrinters = savedBluetoothPrinters();
	if (savedPrinters.length === 0) return null;

	const devices = await navigator.bluetooth.getDevices();

	for (const saved of savedPrinters) {
		const byId = saved.id
			? devices.find((device) => device.id === saved.id)
			: null;
		if (byId) return byId as BluetoothLikeDevice;

		const savedName = String(saved.name ?? "").trim();
		if (savedName !== "") {
			const byName = devices.find((device) => device.name === savedName);
			if (byName) return byName as BluetoothLikeDevice;
		}
	}

	return null;
}

async function connectLegacyThermalDevice(device: BluetoothLikeDevice) {
	const server = await device.gatt?.connect();
	if (!server) throw new Error("Gagal konek ke printer Bluetooth.");

	const service = await server.getPrimaryService(
		LEGACY_THERMAL_BLUETOOTH_SERVICE,
	);
	const characteristic = await service.getCharacteristic(
		LEGACY_THERMAL_BLUETOOTH_CHARACTERISTIC,
	);

	return { server, characteristic };
}

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer) {
	for (const serviceUuid of THERMAL_BLUETOOTH_SERVICES) {
		try {
			const service = await server.getPrimaryService(serviceUuid);

			if (serviceUuid === LEGACY_THERMAL_BLUETOOTH_SERVICE) {
				try {
					const legacyCharacteristic = await service.getCharacteristic(
						LEGACY_THERMAL_BLUETOOTH_CHARACTERISTIC,
					);
					if (
						legacyCharacteristic.properties.write ||
						legacyCharacteristic.properties.writeWithoutResponse
					) {
						return legacyCharacteristic;
					}
				} catch (_error) {
					// Fall back to scanning writable characteristics on the same service.
				}
			}

			const characteristics = await service.getCharacteristics();
			const writable = characteristics.find(
				(characteristic) =>
					characteristic.properties.write ||
					characteristic.properties.writeWithoutResponse,
			);

			if (writable) return writable;
		} catch (_error) {
			// Some printers expose only one of the known services.
		}
	}

	const services = await server.getPrimaryServices();

	for (const service of services) {
		const characteristics = await service.getCharacteristics();
		const writable = characteristics.find(
			(characteristic) =>
				characteristic.properties.write ||
				characteristic.properties.writeWithoutResponse,
		);

		if (writable) return writable;
	}

	throw new Error("Printer ditemukan, tapi channel tulis tidak tersedia.");
}

async function connectBluetoothInner(allowPicker: boolean) {
	if (!navigator.bluetooth) {
		throw new Error("Browser tidak mendukung Web Bluetooth.");
	}

	if (bluetoothCharacteristic && bluetoothServer?.connected) {
		return bluetoothCharacteristic;
	}

	bluetoothDevice = bluetoothDevice || (await reconnectSavedBluetoothDevice());

	if (!bluetoothDevice && !allowPicker) {
		throw new Error("Printer belum siap. Tap Connect Printer dulu.");
	}

	if (!bluetoothDevice) {
		bluetoothDevice = (await navigator.bluetooth.requestDevice({
			filters: LEGACY_THERMAL_BLUETOOTH_FILTERS,
			optionalServices: THERMAL_BLUETOOTH_SERVICES,
		})) as BluetoothLikeDevice;
		saveBluetoothPrinter(bluetoothDevice);
	}

	try {
		const legacyConnection = await connectLegacyThermalDevice(bluetoothDevice);
		bluetoothServer = legacyConnection.server;
		bluetoothCharacteristic = legacyConnection.characteristic;
	} catch (_legacyError) {
		if (!bluetoothDevice.gatt) {
			throw new Error("Printer Bluetooth tidak punya koneksi GATT.");
		}

		bluetoothServer = bluetoothDevice.gatt.connected
			? bluetoothDevice.gatt
			: await bluetoothDevice.gatt.connect();
		bluetoothCharacteristic = await findWritableCharacteristic(bluetoothServer);
	}

	saveBluetoothPrinter(bluetoothDevice);
	bluetoothDevice.addEventListener("gattserverdisconnected", () => {
		bluetoothServer = null;
		bluetoothCharacteristic = null;
	});

	return bluetoothCharacteristic;
}

export async function autoConnectBluetoothPrinter(
	status?: (message: string, ready: boolean) => void,
	attempts = BLUETOOTH_RECONNECT_ATTEMPTS,
) {
	if (bluetoothConnected()) {
		status?.("Printer siap", true);
		return true;
	}

	const saved = savedBluetoothPrinter();
	if (!saved) {
		status?.("Printer belum connect", false);
		return false;
	}

	if (!navigator.bluetooth) {
		status?.("Bluetooth tidak didukung", false);
		return false;
	}

	if (!canAutoReconnectBluetooth()) {
		status?.("Klik Hubungkan ulang", false);
		return false;
	}

	if (reconnectInFlight) return reconnectInFlight;

	reconnectInFlight = (async () => {
		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			status?.("Printer reconnect...", false);
			try {
				await connectBluetoothPrinter(false);
				status?.("Printer siap", true);
				return true;
			} catch (error) {
				if (attempt >= attempts) throw error;
				await delay(BLUETOOTH_RECONNECT_DELAY_MS);
			}
		}

		return false;
	})();

	try {
		return await reconnectInFlight;
	} catch (_error) {
		status?.("Klik Hubungkan ulang", false);
		return false;
	} finally {
		reconnectInFlight = null;
	}
}

export async function writeBluetoothChunks(
	characteristic: BluetoothRemoteGATTCharacteristic,
	bytes: Uint8Array,
) {
	for (
		let offset = 0;
		offset < bytes.length;
		offset += BLUETOOTH_WRITE_CHUNK_SIZE
	) {
		const chunk = bytes.slice(offset, offset + BLUETOOTH_WRITE_CHUNK_SIZE);
		if (characteristic.writeValueWithoutResponse) {
			await characteristic.writeValueWithoutResponse(chunk);
		} else if (characteristic.writeValue) {
			await characteristic.writeValue(chunk);
		} else {
			throw new Error("Printer tidak menerima data tulis.");
		}
	}
}

export function sanitizeReceiptText(value: unknown) {
	return String(value ?? "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\u00a0/g, " ")
		.replace(/[^\x20-\x7e]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function receiptMoney(value: number | string | null | undefined) {
	const amount = Math.round(Number(value) || 0);
	const sign = amount < 0 ? "-" : "";
	const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

	return `Rp ${sign}${digits}`;
}

function receiptColumnWidth(preference?: PrintPreference) {
	const width = String(preference?.width ?? "58mm").toLowerCase();

	return width.includes("80mm") || width.includes("90mm") ? 42 : 32;
}

function fitReceiptText(value: unknown, width: number) {
	const text = sanitizeReceiptText(value);

	if (text.length <= width) return text;

	return `${text.slice(0, Math.max(0, width - 1))}~`;
}

function centerReceiptText(value: unknown, width: number) {
	const text = fitReceiptText(value, width);
	const left = Math.max(0, Math.floor((width - text.length) / 2));

	return `${" ".repeat(left)}${text}`;
}

function receiptPairLine(left: unknown, right: unknown, width: number) {
	const cleanLeft = sanitizeReceiptText(left);
	const cleanRight = sanitizeReceiptText(right);

	if (cleanRight.length >= width) return fitReceiptText(cleanRight, width);

	const availableLeft = Math.max(1, width - cleanRight.length - 1);
	const fittedLeft = fitReceiptText(cleanLeft, availableLeft);
	const gap = Math.max(1, width - fittedLeft.length - cleanRight.length);

	return `${fittedLeft}${" ".repeat(gap)}${cleanRight}`;
}

function receiptSeparator(width: number) {
	return "-".repeat(width);
}

function receiptPaymentLabel(value: string) {
	const method = sanitizeReceiptText(value).toLowerCase();

	return (
		{
			cash: "Tunai",
			tunai: "Tunai",
			qris: "QRIS",
			bank: "Bank/QRIS",
			transfer: "Transfer",
			bank_transfer: "Transfer",
			gojek_grab: "E-Wallet",
			wallet: "E-Wallet",
		}[method] || sanitizeReceiptText(value).toUpperCase()
	);
}

export interface ThermalReceiptItem {
	product_name: string;
	quantity: number;
	unit_price: number;
	line_total: number;
}

export interface ThermalReceiptPayload {
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
	items: ThermalReceiptItem[];
}

export function receiptTextFromPayload(
	payload: ThermalReceiptPayload,
	preference?: PrintPreference,
) {
	const width = receiptColumnWidth(preference);
	const lines = [
		centerReceiptText(payload.tenant_name, width),
		...(payload.branch?.name
			? [centerReceiptText(payload.branch.name, width)]
			: []),
		...(payload.branch?.address
			? [centerReceiptText(payload.branch?.address, width)]
			: []),
		...(payload.branch?.phone
			? [centerReceiptText(`Telp: ${payload.branch?.phone}`, width)]
			: []),
		receiptSeparator(width),
		fitReceiptText(payload.sale_number, width),
		fitReceiptText(payload.sold_at, width),
		...(payload.cashier
			? [fitReceiptText(`Kasir: ${payload.cashier}`, width)]
			: []),
		receiptSeparator(width),
	];

	for (const item of payload.items) {
		lines.push(fitReceiptText(item.product_name, width));
		lines.push(
			receiptPairLine(
				`${Number(item.quantity) || 0} x ${receiptMoney(item.unit_price)}`,
				receiptMoney(item.line_total),
				width,
			),
		);
	}

	lines.push(receiptSeparator(width));
	lines.push(
		receiptPairLine("Subtotal", receiptMoney(payload.subtotal), width),
	);
	lines.push(
		receiptPairLine("TOTAL", receiptMoney(payload.grand_total), width),
	);
	lines.push(
		receiptPairLine("Dibayar", receiptMoney(payload.paid_total), width),
	);
	lines.push(
		receiptPairLine("Kembali", receiptMoney(payload.change_total), width),
	);
	lines.push(
		receiptPairLine(
			"Metode",
			receiptPaymentLabel(payload.payment_method),
			width,
		),
	);
	lines.push(receiptSeparator(width), "Terima kasih.");

	return lines.join("\n");
}

export function receiptBytes(text: string) {
	const encoder = new TextEncoder();
	const body = encoder.encode(`${text}\n\n\n`);
	const init = [
		0x1b,
		0x40, // Initialize printer.
		0x1b,
		0x21,
		0x00, // Normal font mode.
		0x1d,
		0x21,
		0x00, // Normal character size.
		0x1b,
		0x45,
		0x00, // Bold off.
		0x1b,
		0x61,
		0x00, // Left align.
	];
	const cut = [0x1d, 0x56, 0x42, 0x00];
	const bytes = new Uint8Array(init.length + body.length + cut.length);
	bytes.set(init, 0);
	bytes.set(body, init.length);
	bytes.set(cut, init.length + body.length);

	return bytes;
}

export async function printThermalBluetoothReceipt(
	payload: ThermalReceiptPayload,
	preference?: PrintPreference,
	options: { allowPicker?: boolean; reconnectBeforePrint?: boolean } = {},
) {
	if (options.reconnectBeforePrint && !bluetoothConnected()) {
		await autoConnectBluetoothPrinter(undefined, 2);
	}

	const characteristic = await connectBluetoothPrinter(
		options.allowPicker ?? true,
	);
	const receiptText = receiptTextFromPayload(payload, preference);
	await writeBluetoothChunks(characteristic, receiptBytes(receiptText));
}

export async function connectBluetoothPrinter(allowPicker = true) {
	const btTimeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error("Bluetooth timeout")), 30000)
	);
	try {
		return await Promise.race([connectBluetoothInner(allowPicker), btTimeout]);
	} catch (err) {
		bluetoothDevice = null;
		bluetoothServer = null;
		bluetoothCharacteristic = null;
		throw err;
	}
}
export async function testThermalBluetoothPrinter() {
	const characteristic = await connectBluetoothPrinter(true);
	await writeBluetoothChunks(
		characteristic,
		receiptBytes("RangKayo POS\nPrinter siap"),
	);
}
