import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteService } from '@/core/services/client/api';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { userState } from '@/core/stores';
import { useAtom, useAtomValue } from 'jotai';
import { favoritesState } from '@/core/stores/common/favorites';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * A React hook that manages favorites operations.
 *
 * The `useFavorites` hook returns an object with the following properties:
 *
 * - `createFavorite`: A function that creates a new favorite.
 * - `getFavoritesByEmployee`: A function that gets favorites by employee ID.
 * - `getFavorites`: A function that gets all favorites for the organization.
 * - `getFavoriteById`: A function that gets a specific favorite by ID.
 * - `deleteFavorite`: A function that deletes a favorite.
 * - `updateFavorite`: A function that updates a favorite.
 * - Loading states for each operation.
 */
export const useFavorites = () => {
	const user = useAtomValue(userState);
	const [favorites, setFavorites] = useAtom(favoritesState);
	const queryClient = useQueryClient();

	const employeeId = user?.employee?.id || user?.employeeId || '';

	// Query for getting favorites by employee
	const favoritesQuery = useQuery({
		queryKey: queryKeys.favorites.byEmployee(employeeId),
		queryFn: () => favoriteService.getFavoritesByEmployee(employeeId),
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
		onSuccess: invalidateEmployeeFavoritesData
	});

	// Delete favorite mutation
	const deleteFavoriteMutation = useMutation({
		mutationFn: (favoriteId: string) => favoriteService.deleteFavorite(favoriteId),
		onSuccess: invalidateEmployeeFavoritesData
	});

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (favoritesQuery.data) {
				setFavorites(favoritesQuery.data.items);
			}
		},
		[favoritesQuery.data],
		Boolean(favorites?.length)
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
				queryFn: () => favoriteService.getFavoritesByEmployee(employeeId)
			});
		},
		[queryClient]
	);

	const deleteFavorite = useCallback(
		async (id: ID) => {
			const favoriteId = favorites.find((favorite) => favorite.entityId === id)?.id;
			if (favoriteId) {
				return deleteFavoriteMutation.mutateAsync(favoriteId);
			}
		},
		[deleteFavoriteMutation, favorites]
	);

	const toggleFavoriteTask = async (task: TTask) => {
		if (!task) return;

		const isFavoriteTask = favorites.some((el) => {
			return el.entity === EBaseEntityEnum.Task && el.entityId === task.id;
		});

		if (isFavoriteTask) {
			await deleteFavorite(task.id);
		} else {
			await createFavorite({
				entity: EBaseEntityEnum.Task,
				entityId: task.id,
				...(user?.employee?.id || user?.employeeId
					? { employeeId: user?.employee?.id || user?.employeeId }
					: {})
			} as IFavoriteCreateRequest);
		}
	};

	return {
		// Methods
		createFavorite,
		getFavoritesByEmployee,
		deleteFavorite,

		// Loading states
		loading: favoritesQuery.isLoading,
		createFavoriteLoading: createFavoriteMutation.isPending,
		getFavoritesByEmployeeLoading: favoritesQuery.isLoading,
		deleteFavoriteLoading: deleteFavoriteMutation.isPending,

		toggleFavoriteTask
	};
};
