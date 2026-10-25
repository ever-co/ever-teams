import { z } from 'zod';
import { uuIdSchema } from './base.schema';
import { EFileStorageProvider } from '../../generics/enums/file-storage';
import { basePerTenantAndOrganizationEntitySchema } from './tenant-organization.schema';

/**
 * Zod schemas for Image Asset-related interfaces
 */

// File storage provider enum schema (simplified)
export const fileStorageProviderSchema = z.nativeEnum(EFileStorageProvider);

// Image asset schema
export const imageAssetSchema = z
	.object({
		name: z.string().nullable(),
		url: z.string(),
		// Gauzy stores a null thumb when it cannot build a thumbnail
		thumb: z.string().optional().nullable(),
		width: z.number().optional(),
		height: z.number().optional(),
		size: z.number().optional().nullable(),
		isFeatured: z.boolean().optional(),
		externalProviderId: uuIdSchema.optional().nullable(),
		storageProvider: fileStorageProviderSchema.optional().nullable(),
		fullUrl: z.string().optional().nullable(),
		thumbUrl: z.string().optional().nullable()
	})
	.merge(basePerTenantAndOrganizationEntitySchema)
	.strict();

// Create image assets schema
export const createImageAssetsSchema = z.object({
	tenantId: z.string(),
	organizationId: z.string(),
	file: z.any() // File object
});

// Export TypeScript types
export type TImageAsset = z.infer<typeof imageAssetSchema>;
export type TCreateImageAssets = z.infer<typeof createImageAssetsSchema>;
