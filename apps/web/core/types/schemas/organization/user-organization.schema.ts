import { z } from 'zod';
import { idSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';
import { organizationSchema } from './organization.schema';

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
// Export TypeScript types
export type BaseUserOrganization = z.infer<typeof baseUserOrganizationSchema>;
export type UserOrganization = z.infer<typeof userOrganizationSchema>;
export type TOrganization = z.infer<typeof organizationSchema>;
