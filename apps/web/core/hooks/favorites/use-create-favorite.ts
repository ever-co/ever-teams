'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { favoriteService } from '@/core/services/client/api';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { useInvalidateFavorites } from './use-invalidate-favorites';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

/**
 * Hook for creating a favorite (WRITE only).
 * Invalidates favorites cache on success.
 *
 * @returns Object containing createFavorite function and loading state
 */
export function useCreateFavorite() {
	const t = useTranslations();
	const { invalidateFavorites } = useInvalidateFavorites();

	const createFavoriteMutation = useMutation({
		mutationFn: favoriteService.createFavorite,
		onSuccess: () => {
			toast.success(t('task.toastMessages.FAVORITE_ITEM_CREATED_SUCCESSFULLY'));
			invalidateFavorites();
		}
	});

	const createFavorite = useCallback(
		(data: IFavoriteCreateRequest) => createFavoriteMutation.mutateAsync(data),
		[createFavoriteMutation]
	);

	return {
		createFavorite,
		createFavoriteLoading: createFavoriteMutation.isPending
	};
}

