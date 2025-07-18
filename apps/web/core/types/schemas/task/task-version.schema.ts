import { z } from 'zod';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { relationalOrganizationProjectSchema, relationalOrganizationTeamSchema } from '../common/base.schema';

/**
 * Zod schemas for TaskVersion-related interfaces
 */

// Main task version schema
export const taskVersionSchema = z
	.object({
		name: z.string(),
		value: z.string(),
		description: z.string().optional().nullable(),
		icon: z.string().optional().nullable(),
		color: z.string().optional().nullable(),
		isSystem: z.boolean().optional(),
		fullIconUrl: z.string().optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationProjectSchema)
	.merge(relationalOrganizationTeamSchema)
	.strict();

export const taskVersionCreateSchema = z.object({
	name: z.string(),
	value: z.string().optional(),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	fullIconUrl: z.string().optional().nullable(),
	projectId: z.string().optional().nullable(),
	organizationTeamId: z.string().optional().nullable(),
	organizationId: z.string().optional().nullable(),
	tenantId: z.string()
});

// Task version update schema (partial of create schema with optional id)
export const taskVersionUpdateSchema = taskVersionCreateSchema.partial().extend({
	id: z.string().optional()
});

// Get task versions request schema
export const getTaskVersionsRequestSchema = z
	.object({
		projectId: z.string().optional().nullable(),
		organizationTeamId: z.string().optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema);

// Export TypeScript types
export type TTaskVersion = z.infer<typeof taskVersionSchema>;
export type TTaskVersionCreate = z.infer<typeof taskVersionCreateSchema>;
export type TTaskVersionUpdate = z.infer<typeof taskVersionUpdateSchema>;
export type TGetTaskVersionsRequest = z.infer<typeof getTaskVersionsRequestSchema>;
