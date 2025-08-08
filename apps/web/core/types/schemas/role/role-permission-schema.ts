import { z } from 'zod';
import { uuIdSchema, basePerTenantEntityModelSchema } from '../common/base.schema';
import { roleSchema } from '@/core/types/schemas/role/role.schema';

// Role permission schema

export const rolePermissionSchema = z
	.object({
		role: roleSchema,
		roleId: uuIdSchema,
		permission: z.string(),
		enabled: z.boolean(),
		description: z.string()
	})
	.merge(basePerTenantEntityModelSchema)
	.strict();

// Inferred TypeScript types from Zod schemas
export type TRolePermission = z.infer<typeof rolePermissionSchema>;
