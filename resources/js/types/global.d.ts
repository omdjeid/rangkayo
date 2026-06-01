import { PageProps as InertiaPageProps } from "@inertiajs/core";
import { AxiosInstance } from "axios";
import { route as ziggyRoute } from "ziggy-js";
import { PageProps as AppPageProps } from "./";

declare global {
	interface Window {
		axios: AxiosInstance;
	}

	interface BluetoothRemoteGATTCharacteristic {
		properties: {
			write?: boolean;
			writeWithoutResponse?: boolean;
		};
		writeValue?: (value: BufferSource) => Promise<void>;
		writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
	}

	interface BluetoothRemoteGATTService {
		getCharacteristic: (
			uuid: string,
		) => Promise<BluetoothRemoteGATTCharacteristic>;
		getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristic[]>;
	}

	interface BluetoothRemoteGATTServer {
		connected: boolean;
		connect: () => Promise<BluetoothRemoteGATTServer>;
		disconnect?: () => void;
		getPrimaryService: (uuid: string) => Promise<BluetoothRemoteGATTService>;
		getPrimaryServices: () => Promise<BluetoothRemoteGATTService[]>;
	}

	interface BluetoothDevice extends EventTarget {
		id: string;
		name?: string;
		gatt?: BluetoothRemoteGATTServer;
	}

	interface Bluetooth {
		getDevices?: () => Promise<BluetoothDevice[]>;
		requestDevice: (options: {
			filters?: Array<{ services?: string[]; namePrefix?: string }>;
			optionalServices?: string[];
			acceptAllDevices?: boolean;
		}) => Promise<BluetoothDevice>;
	}

	
interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
}

interface Serial {
    requestPort(): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
}

interface Navigator {
	serial?: Serial;
		bluetooth?: Bluetooth;
	}

	/* eslint-disable no-var */
	var route: typeof ziggyRoute;
}

declare module "@inertiajs/core" {
	interface PageProps extends InertiaPageProps, AppPageProps {}
}
