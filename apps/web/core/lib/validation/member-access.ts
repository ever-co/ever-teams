import { z } from 'zod';

/** The page of inactive employees asked from the proxy. Gauzy counts its pages from 1. */
export const inactiveEmployeesQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1)
	})
	.strip();

/** The one field the role route forwards: nothing else of an account can be changed through it. */
export const userRoleBodySchema = z
	.object({
		roleId: z.guid()
	})
	.strip();

export const userRouteIdSchema = z.guid();

/**
 * What the role route reads of Gauzy's answers before it decides: the caller's own permissions, the roles of the
 * workspace and the account whose role is asked to change. Nothing else of these answers is used.
 */
export const roleChangeFactsSchema = z.object({
	permissions: z.array(
		z.object({
			permission: z.string().nullable().optional(),
			enabled: z.boolean().nullable().optional()
		})
	),
	roles: z.object({
		items: z.array(z.object({ id: z.string(), name: z.string() }))
	}),
	account: z.object({
		id: z.string(),
		roleId: z.string().nullable().optional()
	})
});

export type RoleChangeFacts = z.infer<typeof roleChangeFactsSchema>;
