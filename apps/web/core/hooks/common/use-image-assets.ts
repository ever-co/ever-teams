'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { imageAssetsService } from '@/core/services/client/api';
import { TImageAsset } from '@/core/types/schemas/common/image-asset.schema';

export function useImageAssets() {
	// React Query mutation for creating image assets
	const createImageAssetsMutation = useMutation({
		mutationFn: async ({
			file,
			folder,
			tenantId,
			organizationId
		}: {
			file: File;
			folder: string;
			tenantId: string;
			organizationId: string;
		}): Promise<TImageAsset> => {
			return await imageAssetsService.uploadImageAsset(file, folder, tenantId, organizationId);
		},
		onError: (error) => {
			console.error('Image asset upload error:', error);
		}
	});

	// Preserve exact interface - createImageAssets function
	const createImageAssets = useCallback(
		async (file: File, folder: string, tenantId: string, organizationId: string) => {
			return await createImageAssetsMutation.mutateAsync({
				file,
				folder,
				tenantId,
				organizationId
			});
		},
		[createImageAssetsMutation]
	);

	return {
		loading: createImageAssetsMutation.isPending,
		createImageAssets
	};
}
