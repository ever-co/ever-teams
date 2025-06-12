import { z } from 'zod';
import { idSchema } from './base.schema';
import { EFileStorageProvider } from '../../generics/enums/file-storage';
import { basePerTenantAndOrganizationEntityModelSchema } from './tenant-organization.schema';

/**
 * Zod schemas for Image Asset-related interfaces
 */

// File storage provider enum schema (simplified)
export const fileStorageProviderSchema = z.nativeEnum(EFileStorageProvider);

// Image asset schema
export const imageAssetSchema = z
	.object({
		name: z.string(),
		url: z.string(),
		thumb: z.string().optional(),
		width: z.number().optional(),
		height: z.number().optional(),
		size: z.number().optional(),
		isFeatured: z.boolean().optional(),
		externalProviderId: idSchema.optional(),
		storageProvider: fileStorageProviderSchema.optional(),
		fullUrl: z.string().optional(),
		thumbUrl: z.string().optional()
	})
	.merge(basePerTenantAndOrganizationEntityModelSchema)
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
