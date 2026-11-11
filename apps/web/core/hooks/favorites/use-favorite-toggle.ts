'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { favoriteOf, withFavoriteAdded, withFavoriteRemoved } from '@/core/lib/utils/favorites';
import { queryKeys } from '@/core/query/keys';
import { favoriteService } from '@/core/services/client/api/favorites/favorite.service';
import type { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import type { TFavorite } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useFavoritesQuery } from './use-favorites-query';

/** A favourite filed in the list before the platform answered: never an id to send. */
const PLACEHOLDER_PREFIX = 'pending-';

/** Every change of one person's favourites, whatever their entity: they share one list. */
function toggleScopeOf(employeeId: string) {
	return [...queryKeys.favorites.byEmployee(employeeId), 'toggle'] as const;
}

/** The changes of one entity's favourites of one person, shared by every star and menu of the app. */
function toggleKeyOf(employeeId: string, entity: EBaseEntityEnum) {
	return [...toggleScopeOf(employeeId), entity] as const;
}

/**
 * Adds or removes the person's favourite of an item of one entity (#5017), for every star of the app. Whether an item
 * is a favourite is read from all their favourites, not from the active team's tasks; a change shows at once in every
 * list and comes back when the platform refuses it. The changes running are shared by every control (the mutation
 * cache): while an item's favourite changes, no other star or menu sends another request for it.
 */
export function useFavoriteToggle(entity: EBaseEntityEnum) {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';
	const { currentEmployeeFavorites } = useFavoritesQuery();
	const queryKey = useMemo(() => queryKeys.favorites.byEmployee(employeeId), [employeeId]);
	const mutationKey = useMemo(() => toggleKeyOf(employeeId, entity), [employeeId, entity]);

	const pendingVariables = useMutationState({
		filters: { mutationKey, status: 'pending' },
		select: (mutation) => mutation.state.variables as string
	});
	const pendingIds = useMemo(() => new Set(pendingVariables), [pendingVariables]);

	const isFavorite = useCallback(
		(entityId: string) => Boolean(favoriteOf(currentEmployeeFavorites, entity, entityId)),
		[currentEmployeeFavorites, entity]
	);

	const isPending = useCallback((entityId: string) => pendingIds.has(entityId), [pendingIds]);

	const { mutateAsync } = useMutation({
		mutationKey,
		mutationFn: async (entityId: string): Promise<boolean> => {
			// Decide on the whole list: a click before it arrived must neither drop other favourites nor create twice
			const page = await queryClient.ensureQueryData({
				queryKey,
				queryFn: () => favoriteService.getFavoritesByEmployee({ employeeId })
			});
			const existing = favoriteOf(page.items, entity, entityId);
			if (existing?.id.startsWith(PLACEHOLDER_PREFIX)) {
				return true;
			}
			// The list only: the favourite tasks' details, keyed under it, keep loading
			await queryClient.cancelQueries({ queryKey, exact: true });
			const placeholder = { id: `${PLACEHOLDER_PREFIX}${entityId}`, entity, entityId, employeeId } as TFavorite;
			queryClient.setQueryData<PaginationResponse<TFavorite>>(queryKey, (current) =>
				existing ? withFavoriteRemoved(current, entity, entityId) : withFavoriteAdded(current, placeholder)
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
				queryClient.setQueryData<PaginationResponse<TFavorite>>(queryKey, (current) =>
					withFavoriteAdded(withFavoriteRemoved(current, entity, entityId), created)
				);
				return true;
			} catch (error) {
				// Undo this item's change only: another item's change made meanwhile keeps its favourite and its real id
				queryClient.setQueryData<PaginationResponse<TFavorite>>(queryKey, (current) => {
					const withoutItem = withFavoriteRemoved(current, entity, entityId);
					return existing ? withFavoriteAdded(withoutItem, existing) : withoutItem;
				});
				throw error;
			}
		},
		// The list is read again once the person's last change has settled (this one still counts while it settles):
		// a read in between could miss a change still on its way
		onSettled: async () => {
			const isLastChange = queryClient.isMutating({ mutationKey: toggleScopeOf(employeeId) }) <= 1;
			if (isLastChange) {
				await queryClient.invalidateQueries({ queryKey });
			}
		}
	});

	/**
	 * Resolves with whether the item is a favourite afterwards. Rejects when the platform refused, with the list as it
	 * was before; while the item's favourite is already changing, from this control or another, it changes nothing.
	 */
	const toggleFavorite = useCallback(
		async (entityId: string): Promise<boolean> => {
			const isRunning =
				queryClient.isMutating({
					mutationKey,
					predicate: (mutation) => mutation.state.variables === entityId
				}) > 0;
			if (!employeeId || isRunning) {
				return isFavorite(entityId);
			}
			return mutateAsync(entityId);
		},
		[employeeId, isFavorite, mutateAsync, mutationKey, queryClient]
	);

	return { isFavorite, isPending, hasPending: pendingIds.size > 0, toggleFavorite };
}
