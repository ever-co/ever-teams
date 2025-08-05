import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteService } from '@/core/services/client/api';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { userState } from '@/core/stores';
import { useAtom, useAtomValue } from 'jotai';
import { currentEmployeeFavoritesState, organizationFavoritesState } from '@/core/stores/common/favorites';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

/**
 * A React hook that manages favorites operations.
 *
 * The `useFavorites` hook returns an object with the following properties:
 *
 * - `createFavorite`: A function that creates a new favorite.
 * - `getFavoritesByEmployee`: A function that gets favorites by employee ID.
 * - `deleteFavorite`: A function that deletes a favorite.
 * - Loading states for each operation.
 */
export const useFavorites = () => {
	const t = useTranslations();
	const user = useAtomValue(userState);
	const employeeId = user?.employee?.id || user?.employeeId || '';
	const [currentEmployeeFavorites, setCurrentEmployeeFavorites] = useAtom(currentEmployeeFavoritesState);
	const [organizationFavorites] = useAtom(organizationFavoritesState);
	const queryClient = useQueryClient();

	// Query for getting favorites by employee
	const favoritesQuery = useQuery({
		queryKey: queryKeys.favorites.byEmployee(employeeId),
		queryFn: () => favoriteService.getFavoritesByEmployee({ employeeId }),
		enabled: Boolean(employeeId),
		staleTime: 30 * 60 * 1000, // 30 minutes
		gcTime: 60 * 60 * 1000 // 1 hour - favorites are relatively stable, cache for 1 hour
	});

	// Invalidate favorites data
	const invalidateEmployeeFavoritesData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.favorites.byEmployee(employeeId) }),
		[queryClient, employeeId]
	);

	// Create favorite mutation
	const createFavoriteMutation = useMutation({
		mutationFn: favoriteService.createFavorite,
		onSuccess: () => {
			toast.success(t('task.toastMessages.FAVORITE_ITEM_CREATED_SUCCESSFULLY'));
			invalidateEmployeeFavoritesData();
		}
	});

	// Delete favorite mutation
	const deleteFavoriteMutation = useMutation({
		mutationFn: (favoriteId: string) => favoriteService.deleteFavorite(favoriteId),
		onSuccess: () => {
			toast.success(t('task.toastMessages.FAVORITE_ITEM_DELETED_SUCCESSFULLY'));
			invalidateEmployeeFavoritesData();
		}
	});

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (favoritesQuery.data) {
				setCurrentEmployeeFavorites(favoritesQuery.data.items);
			}
		},
		[favoritesQuery.data],
		Boolean(currentEmployeeFavorites?.length)
	);

	const createFavorite = useCallback(
		async (data: IFavoriteCreateRequest) => {
			return createFavoriteMutation.mutateAsync(data);
		},
		[createFavoriteMutation]
	);

	const getFavoritesByEmployee = useCallback(
		async (employeeId: ID) => {
			return queryClient.fetchQuery({
				queryKey: queryKeys.favorites.byEmployee(employeeId),
				queryFn: () => favoriteService.getFavoritesByEmployee({ employeeId })
			});
		},
		[queryClient]
	);

	const deleteFavorite = useCallback(
		async (id: ID) => {
			const favoriteId = currentEmployeeFavorites.find((favorite) => favorite.entityId === id)?.id;
			if (favoriteId) {
				return deleteFavoriteMutation.mutateAsync(favoriteId);
			}
		},
		[deleteFavoriteMutation, currentEmployeeFavorites]
	);

	return {
		currentEmployeeFavorites,
		organizationFavorites,

		// Methods
		createFavorite,
		getFavoritesByEmployee,
		deleteFavorite,

		// Loading states
		loading: favoritesQuery.isLoading,
		createFavoriteLoading: createFavoriteMutation.isPending,
		getFavoritesByEmployeeLoading: favoritesQuery.isLoading,
		deleteFavoriteLoading: deleteFavoriteMutation.isPending
	};
};
