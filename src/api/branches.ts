// src/api/branches.ts
import { http } from '@/api/client';
import { z } from 'zod';
import { BranchSchema, Branch } from '@/api/schemas';

const BranchesArray = z.array(BranchSchema);

type OBGeo = { Latitude?: string | number; Longitude?: string | number };
type OBPostal = {
	BuildingNumber?: string;
	StreetName?: string;
	TownName?: string;
	GeoLocation?: { GeographicCoordinates?: OBGeo };
};

function toNumber(value: unknown): number | null {
	const n =
		typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
	return Number.isFinite(n) ? n : null;
}

// Heuristic: does an item already look like our simplified Branch shape?
function looksLikeSimpleBranch(item: any): boolean {
	return (
		item &&
		typeof item.id === 'string' &&
		typeof item.name === 'string' &&
		(typeof item.lat === 'number' || typeof item.lat === 'string') &&
		(typeof item.lon === 'number' || typeof item.lon === 'string')
	);
}

// Flatten Open Banking { data: [{ Brand: [{ Branch: [...] }] }, ...] } into simple items
function flattenOpenBankingData(dataArray: any[]): any[] {
	const out: any[] = [];
	for (const dataItem of dataArray) {
		const brands = dataItem?.Brand;
		if (!Array.isArray(brands)) continue;

		for (const brand of brands) {
			const branchArray = brand?.Branch;
			if (!Array.isArray(branchArray)) continue;

			for (const branchItem of branchArray) {
				const postal: OBPostal | undefined = branchItem?.PostalAddress;
				const geo: OBGeo | undefined = postal?.GeoLocation?.GeographicCoordinates;

				const id =
					branchItem?.Identification != null ? String(branchItem.Identification) : '';
				const name = branchItem?.Name != null ? String(branchItem.Name) : '';

				const building = postal?.BuildingNumber?.trim?.();
				const street = postal?.StreetName?.trim?.();
				const address =
					building || street ? [building, street].filter(Boolean).join(' ') : undefined;

				const city = postal?.TownName;

				const days: any[] | undefined = branchItem?.Availability?.StandardAvailability?.Day;
				const workingHours = Array.isArray(days)
					? days
							.map((d: any) => {
								const dayName = d?.Name;
								const window = Array.isArray(d?.OpeningHours)
									? d.OpeningHours[0]
									: null;
								const open = window?.OpeningTime;
								const close = window?.ClosingTime;
								return dayName && open && close
									? `${dayName}: ${open}-${close}`
									: null;
							})
							.filter(Boolean)
							.join('; ')
					: undefined;

				const lat = toNumber(geo?.Latitude);
				const lon = toNumber(geo?.Longitude);

				out.push({ id, name, address, city, workingHours, lat, lon });
			}
		}
	}
	return out;
}

/**
 * Extract a branch list from common response shapes.
 * Priority:
 *   1) { data: OB OpenBanking } → flatten to branches (if any found)
 *   2) arrays that already look like simple Branch items
 *   3) { branches: [] }, { data: { branches|items: [] } }
 */
function extractBranchesCandidate(responseBody: unknown): any[] | null {
	if (Array.isArray(responseBody)) {
		// If it's already an array of simple items, return it; otherwise null to keep trying
		return responseBody.some(looksLikeSimpleBranch) ? responseBody : null;
	}

	if (responseBody && typeof responseBody === 'object') {
		const wrapper = responseBody as Record<string, unknown>;

		// Explicit wrapper: { branches: [...] }
		if (Array.isArray(wrapper.branches)) return wrapper.branches as any[];

		// Open Banking: { data: [...] } → try to flatten first
		if (Array.isArray(wrapper.data)) {
			const flattened = flattenOpenBankingData(wrapper.data as any[]);
			if (flattened.length > 0) return flattened;

			// If not Open Banking, maybe data itself is already simple items.
			if ((wrapper.data as any[]).some(looksLikeSimpleBranch)) {
				return wrapper.data as any[];
			}
		}

		// Nested: { data: { branches|items: [] } }
		if (wrapper.data && typeof wrapper.data === 'object') {
			const nested = wrapper.data as Record<string, unknown>;
			if (Array.isArray(nested.branches)) return nested.branches as any[];
			if (Array.isArray(nested.items)) return nested.items as any[];
		}
	}

	return null;
}

export async function fetchBranches(): Promise<Branch[]> {
	const url = 'https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/branches';
	try {
		const { data } = await http.get(url);

		const candidateList = extractBranchesCandidate(data);
		if (!candidateList) {
			const topLevelKeys =
				typeof data === 'object' && data
					? Object.keys(data as Record<string, unknown>)
					: [];
			throw new Error(
				`Invalid API response (/branches): could not locate list.\nTop-level keys: ${JSON.stringify(
					topLevelKeys,
				)}`,
			);
		}

		// Filter out incomplete items before strict validation
		const minimallyValid = candidateList.filter((item) => {
			const hasId = typeof item?.id === 'string' && item.id.length > 0;
			const hasName = typeof item?.name === 'string' && item.name.length > 0;
			const hasLat = Number.isFinite(item?.lat);
			const hasLon = Number.isFinite(item?.lon);
			return hasId && hasName && hasLat && hasLon;
		});

		const skippedCount = candidateList.length - minimallyValid.length;
		console.warn(
			`[branches] extracted=${candidateList.length}, kept=${minimallyValid.length}, skipped=${skippedCount}`,
		);

		const parsed = BranchesArray.parse(minimallyValid);
		console.log(`[branches] parsed ${parsed.length} items`);
		return parsed;
	} catch (error: any) {
		console.error('[branches] fetch error:', {
			message: error?.message,
			status: error?.response?.status,
			data: error?.response?.data,
			isAxios: !!error?.isAxiosError,
		});
		if (error?.response) {
			throw new Error(
				`HTTP ${error.response.status} from /branches: ${JSON.stringify(
					error.response.data,
				).slice(0, 400)}`,
			);
		}
		if (error?.request) {
			throw new Error(`Network error calling /branches: ${error.message}`);
		}
		throw error;
	}
}
