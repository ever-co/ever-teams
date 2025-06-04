import { z } from 'zod';
import { baseEntitySchema } from '../common/base.schema';

/**
 * Zod schemas for Integration Type-related interfaces
 */

// Base integration type schema (IIntegrationType interface)
export const integrationTypeSchema = z
	.object({
		name: z.string(),
		description: z.string().nullable(),
		icon: z.string().nullable(),
		groupName: z.string(),
		order: z.number()
	})
	.merge(baseEntitySchema)
	.strict();

// Integration type list schema (for API responses)
// This schema matches the actual API response structure with string dates
export const integrationTypeListSchema = z
	.object({
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		name: z.string(),
		description: z.string().nullable(),
		icon: z.string().nullable(),
		groupName: z.string(),
		order: z.number(),
		// Additional fields that might be returned by the API
		deletedAt: z.string().optional().nullable(),
		createdByUserId: z.string().optional().nullable(),
		updatedByUserId: z.string().optional().nullable(),
		deletedByUserId: z.string().optional().nullable(),
		isActive: z.boolean().optional().nullable(),
		isArchived: z.boolean().optional().nullable(),
		archivedAt: z.string().optional().nullable()
	})
	.passthrough(); // Allow any additional fields from API

// Minimal integration type schema for essential fields only (fallback option)
export const minimalIntegrationTypeListSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		groupName: z.string(),
		order: z.number()
	})
	.passthrough(); // Allow any additional fields

// Inferred TypeScript types from Zod schemas
export type TIntegrationType = z.infer<typeof integrationTypeSchema>;
export type TIntegrationTypeList = z.infer<typeof integrationTypeListSchema>;
export type TMinimalIntegrationTypeList = z.infer<typeof minimalIntegrationTypeListSchema>;
