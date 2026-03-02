'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { favoriteService } from '@/core/services/client/api';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { useInvalidateFavorites } from './use-invalidate-favorites';
import { useFavoritesQuery } from './use-favorites-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

/**
 * Hook for deleting a favorite by entityId (WRITE only).
 * Looks up the favorite ID from the current employee's favorites, then deletes it.
 * Invalidates favorites cache on success.
 *
 * @returns Object containing deleteFavorite function and loading state
 */
export function useDeleteFavorite() {
	const t = useTranslations();
	const { invalidateFavorites } = useInvalidateFavorites();
	const { currentEmployeeFavorites } = useFavoritesQuery();

	const deleteFavoriteMutation = useMutation({
		mutationFn: (favoriteId: string) => favoriteService.deleteFavorite(favoriteId),
		onSuccess: () => {
			toast.success(t('task.toastMessages.FAVORITE_ITEM_DELETED_SUCCESSFULLY'));
			invalidateFavorites();
		}
	});

	const deleteFavorite = useCallback(
		async (entityId: ID) => {
			const favoriteId = currentEmployeeFavorites.find((favorite) => favorite.entityId === entityId)?.id;
			if (favoriteId) {
				return deleteFavoriteMutation.mutateAsync(favoriteId);
			}
		},
		[deleteFavoriteMutation, currentEmployeeFavorites]
	);

	return {
		deleteFavorite,
		deleteFavoriteLoading: deleteFavoriteMutation.isPending
	};
}

