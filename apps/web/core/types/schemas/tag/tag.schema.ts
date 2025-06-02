import { z } from 'zod';
import { relationalOrganizationTeamSchema, idSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Tag-related interfaces
 */

// Tag type schema
export const tagTypeSchema = z
	.object({
		type: z.string()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(
		z.object({
			tags: z.array(z.lazy(() => tagSchema)).optional() // Taggable interface
		})
	)
	.strict();

// Main tag schema
export const tagSchema = z
	.object({
		name: z.string(),
		color: z.string(),
		textColor: z.string().optional().nullable(),
		icon: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		isSystem: z.boolean().optional(),
		tagTypeId: idSchema.optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.merge(relationalOrganizationTeamSchema)
	.strict();

// Tag create schema
export const tagCreateSchema = z.object({
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
export type TTag = z.infer<typeof tagSchema>;
export type TTagType = z.infer<typeof tagTypeSchema>;
export type TTagCreate = z.infer<typeof tagCreateSchema>;
