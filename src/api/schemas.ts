import { z } from 'zod';

export const BranchSchema = z.object({
	id: z.string(),
	name: z.string(),
	address: z.string().optional(),
	city: z.string().optional(),
	workingHours: z.string().optional(),
	lat: z.coerce.number(),
	lon: z.coerce.number(),
});
export type Branch = z.infer<typeof BranchSchema>;

export const ATMSSchema = z.object({
	atms: z.array(
		z.object({
			id: z.string(),
			lat: z.number(),
			lon: z.number(),
			label: z.string().optional(),
		}),
	),
});
export type ATMsPayload = z.infer<typeof ATMSSchema>;
