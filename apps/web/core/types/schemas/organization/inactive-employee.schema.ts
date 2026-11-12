import { z } from 'zod';

const inactiveEmployeeUserSchema = z.object({
	name: z.string().nullable().optional(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	imageUrl: z.string().nullable().optional()
});

/** A team membership of the employee. MikroORM leaves the id column unset and names the team through the relation. */
const inactiveEmployeeTeamSchema = z.object({
	organizationTeamId: z.string().nullable().optional(),
	organizationTeam: z
		.union([z.string(), z.object({ id: z.string().nullable().optional() })])
		.nullable()
		.optional()
});

/**
 * An employee of Gauzy's `GET /employee/pagination`, cut to what the Inactive list shows. Unknown keys are dropped,
 * so the rest of the employee and of the account never reaches the page or the proxy's answer.
 */
const inactiveEmployeeSchema = z.object({
	id: z.string(),
	fullName: z.string().nullable().optional(),
	endWork: z.string().nullable().optional(),
	user: inactiveEmployeeUserSchema.nullable().optional(),
	teams: z.array(inactiveEmployeeTeamSchema).nullable().optional()
});

export const inactiveEmployeePageSchema = z.object({
	items: z.array(inactiveEmployeeSchema),
	total: z.number()
});

export type TInactiveEmployee = z.infer<typeof inactiveEmployeeSchema>;
export type TInactiveEmployeePage = z.infer<typeof inactiveEmployeePageSchema>;
