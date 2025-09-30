import { z } from 'zod';
import { basePerTenantEntityModelSchema } from './base.schema';

/**
 * Zod schemas for Language-related interfaces
 * @description Base language schema (ILanguage interface)
 */
export const languageSchema = z
	.object({
		name: z.string().optional(),
		code: z.string().optional(),
		is_system: z.boolean().optional(),
		description: z.string().optional(),
		color: z.string().optional(),
		isSelected: z.boolean().optional()
	})
	.merge(basePerTenantEntityModelSchema)
	.strict();

export const languageZodSchemaType: z.ZodType<{
	name?: string;
	code?: string;
	is_system?: boolean;
	description?: string;
	color?: string;
	isSelected?: boolean;
}> = languageSchema.merge(basePerTenantEntityModelSchema);

// Language item list schema (for API responses)
// This schema matches the actual API response structure with string dates
export const languageItemListSchema = z
	.object({
		id: z.string(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		tenantId: z.string().optional(),
		code: z.string(),
		name: z.string(),
		is_system: z.boolean().optional(),
		description: z.string(),
		color: z.string(),
		// Optional fields that may or may not be in the API response
		items: z.array(z.any()).optional(),
		data: z.any().optional(),
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

// Minimal language schema for essential fields only (fallback option)
export const minimalLanguageItemListSchema = z
	.object({
		id: z.string(),
		code: z.string(),
		name: z.string(),
		description: z.string(),
		color: z.string()
	})
	.passthrough(); // Allow any additional fields

// Application language codes schema
export const applicationLanguageCodeSchema = z.enum([
	'en',
	'fr',
	'ar',
	'bg',
	'zh',
	'nl',
	'de',
	'he',
	'it',
	'pl',
	'pt',
	'ru',
	'es'
]);

// Language flag schema
export const languageFlagSchema = z.object({
	Flag: z.any(), // React component
	country: z.string(),
	code: applicationLanguageCodeSchema
});

// Inferred TypeScript types from Zod schemas
export type TLanguage = z.infer<typeof languageSchema>;
export type TLanguageItemList = z.infer<typeof languageItemListSchema>;
export type TMinimalLanguageItemList = z.infer<typeof minimalLanguageItemListSchema>;
export type TApplicationLanguageCode = z.infer<typeof applicationLanguageCodeSchema>;
export type TLanguageFlag = z.infer<typeof languageFlagSchema>;
