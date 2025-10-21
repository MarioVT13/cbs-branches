// src/api/branches.ts
import { http } from '@/api/client';
import { z } from 'zod';
import { BranchSchema, Branch } from '@/api/schemas';

const BranchesArray = z.array(BranchSchema);

// minimal Open Banking types (only what we use)
type OBGeo = { Latitude?: string | number; Longitude?: string | number };
type OBPostal = {
	BuildingNumber?: string;
	StreetName?: string;
	TownName?: string;
	GeoLocation?: { GeographicCoordinates?: OBGeo };
};
type OBOpeningHours = { OpeningTime?: string; ClosingTime?: string };
type OBDay = { Name?: string; OpeningHours?: OBOpeningHours[] };
type OBBBranch = {
	Identification?: string | number;
	Name?: string;
	PostalAddress?: OBPostal;
	Availability?: { StandardAvailability?: { Day?: OBDay[] } };
};
type OBDataItem = { Brand?: { Branch?: OBBBranch[] }[] };
type OBRoot = { data?: OBDataItem[] };

function toNumber(v: unknown): number | null {
	const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
	return Number.isFinite(n) ? n : null;
}

function formatHours(days?: OBDay[]): string | undefined {
	if (!Array.isArray(days)) return undefined;
	const lines = days
		.map((d) => {
			const name = d?.Name;
			const win = Array.isArray(d?.OpeningHours) ? d!.OpeningHours[0] : undefined;
			const open = win?.OpeningTime;
			const close = win?.ClosingTime;
			return name && open && close ? `${name}: ${open}-${close}` : null;
		})
		.filter(Boolean) as string[];
	return lines.length ? lines.join('; ') : undefined;
}

export async function fetchBranches(): Promise<Branch[]> {
	const url = 'https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/branches';

	try {
		const { data } = await http.get(url);
		const root = data as OBRoot;

		// 1) Flatten OB structure → simple objects
		const flat = (root.data ?? [])
			.flatMap((d) => d.Brand ?? [])
			.flatMap((b) => b.Branch ?? [])
			.map((br): Partial<Branch> => {
				const postal = br.PostalAddress;
				const geo = postal?.GeoLocation?.GeographicCoordinates;

				const id = br.Identification != null ? String(br.Identification) : undefined;
				const name = br.Name != null ? String(br.Name) : undefined;

				const building = postal?.BuildingNumber?.trim?.();
				const street = postal?.StreetName?.trim?.();
				const address =
					building || street ? [building, street].filter(Boolean).join(' ') : undefined;

				const city = postal?.TownName;
				const workingHours = formatHours(br.Availability?.StandardAvailability?.Day);

				const lat = toNumber(geo?.Latitude) ?? undefined;
				const lon = toNumber(geo?.Longitude) ?? undefined;

				return { id, name, address, city, workingHours, lat, lon };
			});

		// 2) Filter out incomplete entries (must have id/name/lat/lon)
		const minimallyValid = flat.filter(
			(it) =>
				typeof it.id === 'string' &&
				it.id &&
				typeof it.name === 'string' &&
				it.name &&
				typeof it.lat === 'number' &&
				typeof it.lon === 'number',
		);

		const skipped = flat.length - minimallyValid.length;
		if (skipped) {
			console.warn(`[branches] kept=${minimallyValid.length}, skipped=${skipped}`);
		}

		// 3) Strict-validate the final list
		const parsed = BranchesArray.parse(minimallyValid);
		console.log(`[branches] parsed ${parsed.length} items`);
		return parsed;
	} catch (e: any) {
		console.error('[branches] fetch error:', {
			message: e?.message,
			status: e?.response?.status,
			data: e?.response?.data,
			isAxios: !!e?.isAxiosError,
		});
		if (e?.response) {
			throw new Error(
				`HTTP ${e.response.status} from /branches: ${JSON.stringify(e.response.data).slice(
					0,
					400,
				)}`,
			);
		}
		if (e?.request) {
			throw new Error(`Network error calling /branches: ${e.message}`);
		}
		throw e;
	}
}
