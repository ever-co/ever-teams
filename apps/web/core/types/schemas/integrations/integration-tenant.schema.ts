import { z } from 'zod';
import { baseEntitySchema } from '../common/base.schema';

/**
 * Zod schemas for Integration Tenant-related interfaces
 */

// Base integration tenant schema (IIntegrationTenant interface)
export const integrationTenantSchema = z
	.object({
		tenantId: z.string(),
		organizationId: z.string(),
		name: z.string(),
		integrationId: z.string()
	})
	.merge(baseEntitySchema)
	.strict();

// Integration tenant list schema (for API responses)
// This schema matches the actual API response structure with string dates
export const integrationTenantListSchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		tenantId: z.string(),
		organizationId: z.string(),
		name: z.string(),
		integrationId: z.string(),
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

// Minimal integration tenant schema for essential fields only (fallback option)
export const minimalIntegrationTenantListSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		integrationId: z.string(),
		tenantId: z.string(),
		organizationId: z.string()
	})
	.passthrough(); // Allow any additional fields

// Inferred TypeScript types from Zod schemas
export type TIntegrationTenant = z.infer<typeof integrationTenantSchema>;
export type TIntegrationTenantList = z.infer<typeof integrationTenantListSchema>;
export type TMinimalIntegrationTenantList = z.infer<typeof minimalIntegrationTenantListSchema>;
