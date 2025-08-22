import { z } from 'zod';
import { basePerTenantEntityModelSchema, uuIdSchema } from '../common/base.schema';
import { roleNameSchema } from '../common/enums.schema';

/**
 * Zod schemas for Role-related interfaces
 */

// Main role schema
export const roleSchema = z
	.object({
		name: z.string(),
		isSystem: z.boolean().optional(),
		tenantId: z.string().optional(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional()
		// rolePermissions: z.array(z.lazy(() => rolePermissionSchema)).optional()
	})
	.merge(basePerTenantEntityModelSchema)
	.strict();

// Relational role schema
export const relationalRoleSchema = z.object({
	role: roleSchema.optional().nullable(),
	roleId: uuIdSchema.optional().nullable()
});

// Role list schema (for API responses)
export const roleListSchema = z
	.object({
		items: z.array(roleSchema),
		total: z.number()
	})
	.passthrough();

// Role constants schema (from constants file)
export const roleConstantSchema = z.object({
	isActive: z.boolean(),
	isArchived: z.boolean(),
	name: roleNameSchema,
	isSystem: z.boolean()
});

// Inferred TypeScript types from Zod schemas
export type TRole = z.infer<typeof roleSchema>;
export type TRelationalRole = z.infer<typeof relationalRoleSchema>;
export type TRoleList = z.infer<typeof roleListSchema>;
export type TRoleConstant = z.infer<typeof roleConstantSchema>;
