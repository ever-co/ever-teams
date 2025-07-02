import { z } from 'zod';
import { idSchema } from '../common/base.schema';
import { baseEntityEnumSchema } from '../common/enums.schema';
import { basePerTenantAndOrganizationEntityModelSchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Favorite-related interfaces
 */

// Relational employee schema for favorites (employeeId is optional)
export const favoriteRelationalEmployeeSchema = z.object({
	employeeId: idSchema.optional().nullable(),
	employee: z.any().optional().nullable() // Will be properly typed when employee schema is created
});

// Base per entity type schema
export const basePerEntityTypeSchema = z
	.object({
		entityId: idSchema, // Unique ID of the entity
		entity: baseEntityEnumSchema // The type of the entity, defined in BaseEntityEnum enumeration
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema);

// Main favorite schema
export const favoriteSchema = z
	.object({})
	.merge(favoriteRelationalEmployeeSchema)
	.merge(basePerEntityTypeSchema)
	.strict();

// Favorite create schema
export const favoriteCreateSchema = z.object({
	entityId: idSchema,
	entity: baseEntityEnumSchema,
	employeeId: idSchema.optional().nullable(),
	organizationId: idSchema.optional().nullable(),
	tenantId: idSchema.optional().nullable()
});

// Export TypeScript types
export type TFavorite = z.infer<typeof favoriteSchema>;
export type TFavoriteCreate = z.infer<typeof favoriteCreateSchema>;
