import { z } from 'zod';
import { basePerTenantEntityModelSchema, uuIdSchema } from '../common/base.schema';
import { rolePermissionSchema, TRolePermission } from './role-permission-schema';

/**
 * Zod schemas for Role-related interfaces
 */

const roleBaseSchema = z
	.object({
		name: z.string(),
		isSystem: z.boolean().optional(),
		rolePermissions: z.array(z.lazy(() => rolePermissionSchema)).optional()
	})
	.merge(basePerTenantEntityModelSchema);

// Role schema
export const roleSchema = roleBaseSchema.strict();

export const roleZodSchemaType: z.ZodType<{
	name: string;
	isSystem?: boolean;
	rolePermissions?: TRolePermission[];
}> = roleBaseSchema.merge(basePerTenantEntityModelSchema);

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

// Inferred TypeScript types from Zod schemas
export type TRole = z.infer<typeof roleSchema>;
export type TRelationalRole = z.infer<typeof relationalRoleSchema>;
export type TRoleList = z.infer<typeof roleListSchema>;
