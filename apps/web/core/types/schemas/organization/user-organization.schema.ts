import { z } from 'zod';
import { idSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for User Organization-related interfaces
 */

// Base user organization schema
export const baseUserOrganizationSchema = z
	.object({
		userId: idSchema.optional(),
		isDefault: z.boolean()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
	.strict();

// User organization schema
export const userOrganizationSchema = z
	.object({
		user: z.any().optional() // Will be properly typed when user schema is created
	})
	.merge(baseUserOrganizationSchema)
	.strict();
export const organizationSchema = z.object({
	archivedAt: z.null().nullable(),
	createdAt: z.string(),
	createdByUserId: z.null().nullable(),
	deletedAt: z.null().nullable(),
	deletedByUserId: z.null().nullable(),
	id: z.string(),
	isActive: z.boolean(),
	isArchived: z.boolean(),
	isDefault: z.boolean(),
	organizationId: z.string(),
	tenantId: z.string(),
	updatedAt: z.string(),
	updatedByUserId: z.string().nullable(),
	userId: z.string()
});
// Export TypeScript types
export type BaseUserOrganization = z.infer<typeof baseUserOrganizationSchema>;
export type UserOrganization = z.infer<typeof userOrganizationSchema>;
export type TOrganization = z.infer<typeof organizationSchema>;
