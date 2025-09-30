import { z } from 'zod';
import { relationalOrganizationTeamSchema, relationalOrganizationProjectSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Task Size-related interfaces
 */

// Main task size schema
export const taskSizeSchema = z
	.object({
		name: z.string(),
		value: z.string(),
		description: z.string().optional().nullable(),
		icon: z.string().optional().nullable(),
		color: z.string().optional().nullable(),
		isSystem: z.boolean().optional(),
		fullIconUrl: z.string().optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
	.merge(relationalOrganizationTeamSchema)
	.merge(relationalOrganizationProjectSchema)
	.strict();

// Task size create schema
export const taskSizeCreateSchema = z.object({
	name: z.string(),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	projectId: z.string().optional().nullable(),
	organizationId: z.string().optional().nullable(),
	tenantId: z.string().optional().nullable(),
	organizationTeamId: z.string().optional().nullable()
});

// Export TypeScript types
export type TTaskSize = z.infer<typeof taskSizeSchema>;
export type TTaskSizeCreate = z.infer<typeof taskSizeCreateSchema>;
