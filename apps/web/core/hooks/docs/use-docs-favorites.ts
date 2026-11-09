'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useFavoritesQuery } from '@/core/hooks/favorites/use-favorites-query';
import { useCreateFavorite } from '@/core/hooks/favorites/use-create-favorite';
import { useDeleteFavorite } from '@/core/hooks/favorites/use-delete-favorite';
import { userState } from '@/core/stores/user/user';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';

/** The reader's favourite pages, through the platform's favourites (the same ones the sidebar shows for tasks). */
export function useDocsFavorites() {
	const user = useAtomValue(userState);
	const { currentEmployeeFavorites, isLoading } = useFavoritesQuery();
	const { createFavorite } = useCreateFavorite();
	const { deleteFavorite } = useDeleteFavorite();

	const favoriteIds = useMemo(
		() => new Set(currentEmployeeFavorites.filter((favorite) => favorite.entity === EBaseEntityEnum.Document).map((favorite) => favorite.entityId)),
		[currentEmployeeFavorites]
	);

	const isFavorite = useCallback((pageId: string) => favoriteIds.has(pageId), [favoriteIds]);

	const toggleFavorite = useCallback(
		async (pageId: string) => {
			if (favoriteIds.has(pageId)) {
				await deleteFavorite(pageId);
				return false;
			}
			const employeeId = user?.employee?.id || user?.employeeId;
			await createFavorite({
				entity: EBaseEntityEnum.Document,
				entityId: pageId,
				...(employeeId ? { employeeId } : {})
			} as IFavoriteCreateRequest);
			return true;
		},
		[createFavorite, deleteFavorite, favoriteIds, user?.employee?.id, user?.employeeId]
	);

	return { favoriteIds, isFavorite, toggleFavorite, isLoading };
}
