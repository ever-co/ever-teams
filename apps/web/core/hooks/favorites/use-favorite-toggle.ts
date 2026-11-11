'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { favoriteOf, withFavoriteAdded, withFavoriteRemoved } from '@/core/lib/utils/favorites';
import { queryKeys } from '@/core/query/keys';
import { favoriteService } from '@/core/services/client/api/favorites/favorite.service';
import type { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import type { TFavorite } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useFavoritesQuery } from './use-favorites-query';

/**
 * Adds or removes the person's favourite of an item of one entity (#5017), for every star of the app. Whether an item
 * is a favourite is read from all their favourites, not from the active team's tasks; a change shows at once in every
 * list, comes back when the platform refuses it, and an item takes one request at a time.
 */
export function useFavoriteToggle(entity: EBaseEntityEnum) {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';
	const { currentEmployeeFavorites } = useFavoritesQuery();
	const pendingRef = useRef(new Set<string>());
	const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());

	const isFavorite = useCallback(
		(entityId: string) => Boolean(favoriteOf(currentEmployeeFavorites, entity, entityId)),
		[currentEmployeeFavorites, entity]
	);

	const isPending = useCallback((entityId: string) => pendingIds.has(entityId), [pendingIds]);

	const setPending = useCallback((entityId: string, isNowPending: boolean) => {
		if (isNowPending) {
			pendingRef.current.add(entityId);
		} else {
			pendingRef.current.delete(entityId);
		}
		setPendingIds(new Set(pendingRef.current));
	}, []);

	/**
	 * Resolves with whether the item is a favourite afterwards. Rejects when the platform refused, with the list as it
	 * was before; a click on an item whose request is still running changes nothing.
	 */
	const toggleFavorite = useCallback(
		async (entityId: string): Promise<boolean> => {
			const existing = favoriteOf(currentEmployeeFavorites, entity, entityId);
			if (!employeeId || pendingRef.current.has(entityId)) {
				return Boolean(existing);
			}
			const queryKey = queryKeys.favorites.byEmployee(employeeId);
			setPending(entityId, true);
			try {
				await queryClient.cancelQueries({ queryKey });
				const previous = queryClient.getQueryData<PaginationResponse<TFavorite>>(queryKey);
				const placeholder = { id: `pending-${entityId}`, entity, entityId, employeeId } as TFavorite;
				queryClient.setQueryData<PaginationResponse<TFavorite>>(queryKey, (page) =>
					existing ? withFavoriteRemoved(page, entity, entityId) : withFavoriteAdded(page, placeholder)
				);
				try {
					if (existing) {
						await favoriteService.deleteFavorite(existing.id);
						return false;
					}
					const created = await favoriteService.createFavorite({
						entity,
						entityId,
						employeeId
					} as IFavoriteCreateRequest);
					// The placeholder gives way to the filed favourite at once: removing it again needs its real id
					queryClient.setQueryData<PaginationResponse<TFavorite>>(queryKey, (page) =>
						withFavoriteAdded(withFavoriteRemoved(page, entity, entityId), created)
					);
					return true;
				} catch (error) {
					queryClient.setQueryData(queryKey, previous);
					throw error;
				}
			} finally {
				setPending(entityId, false);
				void queryClient.invalidateQueries({ queryKey });
			}
		},
		[currentEmployeeFavorites, employeeId, entity, queryClient, setPending]
	);

	return { isFavorite, isPending, hasPending: pendingIds.size > 0, toggleFavorite };
}
