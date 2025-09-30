import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';
import { baseEntityEnumSchema } from '../common/enums.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';

/**
 * Zod schemas for Favorite-related interfaces
 */

// Relational employee schema for favorites (employeeId is optional)
export const favoriteRelationalEmployeeSchema = z.object({
	employeeId: uuIdSchema.optional().nullable(),
	employee: z.any().optional().nullable() // Will be properly typed when employee schema is created
});

// Base per entity type schema
export const basePerEntityTypeSchema = z
	.object({
		entityId: uuIdSchema, // Unique ID of the entity
		entity: baseEntityEnumSchema // The type of the entity, defined in BaseEntityEnum enumeration
	})
	.merge(basePerTenantAndOrganizationEntitySchema);

// Main favorite schema
export const favoriteSchema = z
	.object({})
	.merge(favoriteRelationalEmployeeSchema)
	.merge(basePerEntityTypeSchema)
	.strict();

// Favorite create schema
export const favoriteCreateSchema = z.object({
	entityId: uuIdSchema,
	entity: baseEntityEnumSchema,
	employeeId: uuIdSchema.optional().nullable(),
	organizationId: uuIdSchema.optional().nullable(),
	tenantId: uuIdSchema.optional().nullable()
});

// Export TypeScript types
export type TFavorite = z.infer<typeof favoriteSchema>;
export type TFavoriteCreate = z.infer<typeof favoriteCreateSchema>;
