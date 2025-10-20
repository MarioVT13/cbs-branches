// src/api/atms.ts
import { http } from '@/api/client';
import { z } from 'zod';

const ATMItem = z.object({
	id: z.string(),
	lat: z.coerce.number(),
	lon: z.coerce.number(),
	label: z.string().optional(),
});
const ATMList = z.array(ATMItem);

function extractATMsCandidate(body: unknown): unknown[] | null {
	if (Array.isArray(body)) return body;

	if (body && typeof body === 'object') {
		const top = body as Record<string, unknown>;
		if (Array.isArray(top.atms)) return top.atms as unknown[];
		if (Array.isArray(top.data)) return top.data as unknown[];
		if (top.data && typeof top.data === 'object') {
			const nested = top.data as Record<string, unknown>;
			if (Array.isArray(nested.items)) return nested.items as unknown[];
			if (Array.isArray(nested.atms)) return nested.atms as unknown[];
		}
	}
	return null;
}

export async function fetchATMs(): Promise<{ atms: z.infer<typeof ATMItem>[] }> {
	const url = 'https://europe-west1-proto-rn-frbs-4242.cloudfunctions.net/dev_task/atms';
	const { data } = await http.get(url);

	const candidate = extractATMsCandidate(data);
	if (!candidate) {
		const keys = typeof data === 'object' && data ? Object.keys(data as any) : [];
		throw new Error(
			`Invalid API response (/atms): could not locate list.\nTop-level keys: ${JSON.stringify(
				keys,
			)}`,
		);
	}

	const atms = ATMList.parse(candidate);
	console.log(`[atms] parsed ${atms.length} items`);
	return { atms };
}
