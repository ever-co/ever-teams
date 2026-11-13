import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';
import { baseEntityEnumSchema } from '../common/enums.schema';
import { basePerTenantAndOrganizationEntitySchema } from '../common/tenant-organization.schema';
import { employeeSchema } from '../organization/employee.schema';

/**
 * Zod schemas for Favorite-related interfaces
 */

// Relational employee schema for favorites (employeeId is optional)
export const favoriteRelationalEmployeeSchema = z.object({
	employeeId: uuIdSchema.optional().nullable(),
	employee: z
		.lazy(() => employeeSchema)
		.optional()
		.nullable() // Will be properly typed when employee schema is created
});

// Base per entity type schema
export const basePerEntityTypeSchema = z
	.object({
		entityId: uuIdSchema, // Unique ID of the entity
		// Any other string too: Gauzy keeps adding entity types, and one type unknown here must not fail the whole list
		entity: baseEntityEnumSchema.or(z.string()) // The type of the entity, defined in BaseEntityEnum enumeration
	})
	.merge(basePerTenantAndOrganizationEntitySchema);

// Main favorite schema
export const favoriteSchema = z
	.object({})
	.merge(favoriteRelationalEmployeeSchema)
	.merge(basePerEntityTypeSchema)
	.strict();

// Favorite create schema
/**
 * A favourite task as `GET /favorite/type` answers it: the task row alone, without relations. Only what a favourite's
 * row shows is checked; the rest passes through.
 */
export const favoriteTaskSchema = z
	.object({
		id: uuIdSchema,
		title: z.string(),
		number: z.number().nullable().optional(),
		prefix: z.string().nullable().optional(),
		taskNumber: z.string().nullable().optional(),
		issueType: z.string().nullable().optional(),
		status: z.string().nullable().optional()
	})
	.passthrough();

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
export type TFavoriteTask = z.infer<typeof favoriteTaskSchema>;
