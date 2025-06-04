import { z } from 'zod';
import { baseEntitySchema } from '../common/base.schema';
import { integrationTypeSchema } from './integration-type.schema';

/**
 * Zod schemas for Integration-related interfaces
 */

// Base integration schema (IIntegration interface)
export const integrationSchema = z
	.object({
		name: z.string(),
		provider: z.string(),
		redirectUrl: z.string(),
		imgSrc: z.string(),
		isComingSoon: z.boolean(),
		isPaid: z.boolean(),
		version: z.string().nullable(),
		docUrl: z.string().nullable(),
		isFreeTrial: z.boolean(),
		freeTrialPeriod: z.number(),
		order: z.number(),
		integrationTypes: z.array(integrationTypeSchema),
		fullImgUrl: z.string()
	})
	.merge(baseEntitySchema)
	.strict();

// Integration list schema (for API responses)
// This schema matches the actual API response structure with string dates
export const integrationListSchema = z
	.object({
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		name: z.string(),
		provider: z.string(),
		redirectUrl: z.string(),
		imgSrc: z.string(),
		isComingSoon: z.boolean(),
		isPaid: z.boolean(),
		version: z.string().nullable(),
		docUrl: z.string().nullable(),
		isFreeTrial: z.boolean(),
		freeTrialPeriod: z.number(),
		order: z.number(),
		integrationTypes: z.array(z.any()), // Simplified for API response
		fullImgUrl: z.string(),
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

// Minimal integration schema for essential fields only (fallback option)
export const minimalIntegrationListSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		provider: z.string(),
		imgSrc: z.string(),
		isComingSoon: z.boolean(),
		isPaid: z.boolean()
	})
	.passthrough(); // Allow any additional fields

// Inferred TypeScript types from Zod schemas
export type TIntegration = z.infer<typeof integrationSchema>;
export type TIntegrationList = z.infer<typeof integrationListSchema>;
export type TMinimalIntegrationList = z.infer<typeof minimalIntegrationListSchema>;
