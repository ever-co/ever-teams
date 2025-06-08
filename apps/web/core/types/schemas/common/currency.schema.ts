import { z } from 'zod';
import { baseEntitySchema } from './base.schema';

/**
 * Zod schemas for Currency-related interfaces
 */

// Base currency schema (ICurrency interface)
export const currencySchema = z
	.object({
		isoCode: z.string(),
		currency: z.string()
	})
	.merge(baseEntitySchema)
	.strict();

// Currency list schema (for API responses)
// This schema matches the actual API response structure with string dates
export const currencyListSchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.string(),
		tenantId: z.string().optional(),
		organizationId: z.string().optional(),
		isoCode: z.string(),
		currency: z.string(),
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

// Minimal currency schema for essential fields only (fallback option)
export const minimalCurrencyListSchema = z
	.object({
		id: z.string(),
		isoCode: z.string(),
		currency: z.string()
	})
	.passthrough(); // Allow any additional fields

// Inferred TypeScript types from Zod schemas
export type TCurrency = z.infer<typeof currencySchema>;
export type TCurrencyList = z.infer<typeof currencyListSchema>;
export type TMinimalCurrencyList = z.infer<typeof minimalCurrencyListSchema>;
