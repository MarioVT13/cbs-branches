// src/api/atms.ts
import { http } from '@/api/client';
import { z } from 'zod';
import { ATMSSchema, ATMsPayload } from '@/api/schemas';

type OBGeo = { Latitude?: string | number; Longitude?: string | number };
type OBPostal = { GeoLocation?: { GeographicCoordinates?: OBGeo } };
type OBLocation = { PostalAddress?: OBPostal };
type OBATM = { Identification?: string | number; Location?: OBLocation; Name?: string };
type OBBrand = { ATM?: OBATM[] };
type OBData = { Brand?: OBBrand[] };
type OBRoot = { data?: OBData[] };

const toNumber = (v: unknown): number | null => {
	const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
	return Number.isFinite(n) ? n : null;
};

export async function fetchATMs(): Promise<ATMsPayload> {
	const url = 'https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/atms';
	try {
		const { data } = await http.get(url);

		// If it already looks like { atms: [...] }, validate/coerce and return.
		if (data && typeof data === 'object' && Array.isArray((data as any).atms)) {
			const coerced = {
				atms: (data as any).atms.map((a: any) => ({
					id: String(a?.id ?? ''),
					lat: toNumber(a?.lat) ?? NaN,
					lon: toNumber(a?.lon) ?? NaN,
					label: a?.label != null ? String(a.label) : undefined,
				})),
			};
			return ATMSSchema.parse(coerced);
		}

		// OB → flat
		const root = data as OBRoot;
		const flat =
			(root.data ?? [])
				.flatMap((d) => d.Brand ?? [])
				.flatMap((b) => b.ATM ?? [])
				.map((atm): { id?: string; lat?: number; lon?: number; label?: string } => {
					const id = atm.Identification != null ? String(atm.Identification) : undefined;
					const label = atm.Name != null ? String(atm.Name) : undefined;
					const geo = atm.Location?.PostalAddress?.GeoLocation?.GeographicCoordinates;
					const lat = toNumber(geo?.Latitude) ?? undefined;
					const lon = toNumber(geo?.Longitude) ?? undefined;
					return { id, lat, lon, label };
				}) ?? [];

		const kept = flat.filter(
			(a) =>
				typeof a.id === 'string' &&
				a.id &&
				typeof a.lat === 'number' &&
				typeof a.lon === 'number',
		);

		const normalized = {
			atms: kept.map((a) => ({ id: a.id!, lat: a.lat!, lon: a.lon!, label: a.label })),
		};

		const parsed = ATMSSchema.parse(normalized);
		console.log(`[atms] parsed ${parsed.atms.length} items`);
		return parsed;
	} catch (e: any) {
		console.error('[atms] fetch error:', {
			message: e?.message,
			status: e?.response?.status,
			data: e?.response?.data,
			isAxios: !!e?.isAxiosError,
		});
		if (e?.response) {
			throw new Error(
				`HTTP ${e.response.status} from /atms: ${JSON.stringify(e.response.data).slice(
					0,
					400,
				)}`,
			);
		}
		if (e?.request) {
			throw new Error(`Network error calling /atms: ${e.message}`);
		}
		throw e;
	}
}
