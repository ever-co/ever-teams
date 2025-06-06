import { z } from 'zod';

/**
 * Base Zod schemas for common interfaces used across the application
 */

// ID type schema
export const idSchema = z.string();

// Base entity action by user model schema
export const baseEntityActionByUserModelSchema = z.object({
	createdByUser: z.any().optional().nullable(),
	createdByUserId: z.string().optional().nullable(),
	updatedByUser: z.any().optional().nullable(),
	updatedByUserId: z.string().optional().nullable(),
	deletedByUser: z.any().optional().nullable(),
	deletedByUserId: z.string().optional().nullable()
});

// Base soft delete entity model schema
export const baseSoftDeleteEntityModelSchema = z.object({
	deletedAt: z.coerce.date().optional().nullable()
});

// Base entity schema
export const baseEntitySchema = z
	.object({
		id: idSchema,
		createdAt: z.coerce.date().optional().nullable(),
		updatedAt: z.coerce.date().optional().nullable(),
		isActive: z.boolean().optional().nullable(),
		isArchived: z.boolean().optional().nullable(),
		archivedAt: z.coerce.date().optional().nullable()
	})
	.merge(baseEntityActionByUserModelSchema)
	.merge(baseSoftDeleteEntityModelSchema);

// Base per tenant entity model schema
export const basePerTenantEntityModelSchema = z
	.object({
		tenantId: idSchema.optional().nullable(),
		tenant: z.any().optional().nullable() // Will be properly typed when tenant schema is created
	})
	.merge(baseEntitySchema);

// Taggable interface schema
export const taggableSchema = z.object({
	tags: z.array(z.any()).optional() // Will be properly typed when tag schema is created
});

// Relational organization team schema
export const relationalOrganizationTeamSchema = z.object({
	organizationTeam: z.any().optional().nullable(), // Will be properly typed when organization team schema is created
	organizationTeamId: idSchema.optional().nullable()
});

// Relational image asset schema
export const relationalImageAssetSchema = z.object({
	image: z.any().optional().nullable(), // Will be properly typed when image asset schema is created
	imageId: idSchema.optional().nullable(),
	imageUrl: z.string().optional().nullable()
});

// Relational organization project schema
export const relationalOrganizationProjectSchema = z.object({
	project: z.any().optional().nullable(), // Will be properly typed when organization project schema is created
	projectId: idSchema.optional().nullable()
});

// Manager assignable schema
export const managerAssignableSchema = z.object({
	isManager: z.boolean().optional().nullable(),
	assignedAt: z.coerce.date().optional().nullable()
});

// Relational employee schema
export const relationalEmployeeSchema = z.object({
	employeeId: idSchema.optional().nullable(),
	employee: z.any().optional().nullable() // Will be properly typed when employee schema is created
});
