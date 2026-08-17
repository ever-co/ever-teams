'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { imageAssetsService } from '@/core/services/client/api';
import { TImageAsset } from '@/core/types/schemas/common/image-asset.schema';

export function useImageAssets() {
	// React Query mutation for creating image assets
	const createImageAssetsMutation = useMutation({
		mutationFn: async ({ file, folder }: { file: File; folder: string }): Promise<TImageAsset> => {
			return await imageAssetsService.uploadImageAsset({ file, folder });
		},
		onError: (error) => {
			console.error('Image asset upload error:', error);
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const createImageAssetsMutateAsync = createImageAssetsMutation.mutateAsync;
	// Preserve exact interface - createImageAssets function
	const createImageAssets = useCallback(
		async (file: File, folder: string) => {
			return await createImageAssetsMutateAsync({
				file,
				folder
			});
		},
		[createImageAssetsMutateAsync]
	);

	return {
		loading: createImageAssetsMutation.isPending,
		createImageAssets
	};
}
