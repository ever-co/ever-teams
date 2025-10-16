import { z } from 'zod';
import { relationalOrganizationTeamSchema, relationalOrganizationProjectSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Task Priority-related interfaces
 */

// Main task priority schema
export const taskPrioritySchema = z
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

// Task priority create schema
export const taskPriorityCreateSchema = z.object({
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
export type TTaskPriority = z.infer<typeof taskPrioritySchema>;
export type TTaskPriorityCreate = z.infer<typeof taskPriorityCreateSchema>;
