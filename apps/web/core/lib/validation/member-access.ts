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
