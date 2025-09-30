import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for User Organization-related interfaces
 */

// Base user organization schema
export const baseUserOrganizationSchema = z
	.object({
		userId: uuIdSchema.optional(),
		isDefault: z.boolean()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
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
