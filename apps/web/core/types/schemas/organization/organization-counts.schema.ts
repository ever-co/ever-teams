import { z } from 'zod';

const countSchema = z.number().int().nonnegative();

/** What Gauzy's `GET /organization/:id/counts` answers: what the organization holds, before it is deleted. */
export const organizationCountsSchema = z.object({
	teams: countSchema,
	projects: countSchema,
	members: countSchema,
	trackedSeconds: z.number().nonnegative(),
	invoices: countSchema,
	estimates: countSchema
});

export type TOrganizationCounts = z.infer<typeof organizationCountsSchema>;

/** What Gauzy's `GET /organization/count` answers: the live organizations of the workspace. */
export const organizationCountSchema = countSchema;
