export function normalizeQrisString(value: string): string {
	return String(value ?? "").trim().replace(/[\r\n\t]/g, "");
}

export function crc16Ccitt(value: string): string {
	let crc = 0xffff;

	for (let index = 0; index < value.length; index += 1) {
		crc ^= value.charCodeAt(index) << 8;

		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : crc << 1;
			crc &= 0xffff;
		}
	}

	return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildManualQrisPayload(
	baseString: string,
	amount: number,
): string {
	const normalized = normalizeQrisString(baseString);

	if (normalized === "" || normalized.length <= 8) {
		return "";
	}

	const amountValue = Math.round(Number(amount) || 0);

	if (amountValue <= 0) {
		return "";
	}

	const nominal = String(amountValue);
	let qris = normalized.replace("010211", "010212");
	qris = qris.substring(0, qris.length - 8);

	const tag54 = `54${String(nominal.length).padStart(2, "0")}${nominal}`;

	if (!qris.includes("5802ID")) {
		return "";
	}

	qris = qris.replace("5802ID", `${tag54}5802ID`);
	qris += "6304";

	return `${qris}${crc16Ccitt(qris)}`;
}
