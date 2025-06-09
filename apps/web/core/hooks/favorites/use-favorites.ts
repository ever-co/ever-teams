import { useCallback } from 'react';
import { useQueryCall } from '../common/use-query';
import { favoriteService } from '@/core/services/client/api';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { useFirstLoad } from '../common';
import { userState } from '@/core/stores';
import { useAtom, useAtomValue } from 'jotai';
import { favoritesState } from '@/core/stores/common/favorites';
import { ITask } from '@/core/types/interfaces/task/task';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';

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
	const { firstLoadData: firstRolesLoad } = useFirstLoad();
	// Create favorite
	const { loading: createFavoriteLoading, queryCall: createFavoriteQueryCall } = useQueryCall(
		favoriteService.createFavorite
	);

	// Get favorites by employee
	const { loading: getFavoritesByEmployeeLoading, queryCall: getFavoritesByEmployeeQueryCall } = useQueryCall(
		favoriteService.getFavoritesByEmployee
	);

	// Delete favorite
	const { loading: deleteFavoriteLoading, queryCall: deleteFavoriteQueryCall } = useQueryCall(
		favoriteService.deleteFavorite
	);

	const createFavorite = useCallback(
		async (data: IFavoriteCreateRequest) => {
			const res = await createFavoriteQueryCall(data);

			setFavorites((favorites) => [...favorites, res.data]);
			return res;
		},
		[createFavoriteQueryCall]
	);

	const getFavoritesByEmployee = useCallback(
		(employeeId: ID) => {
			return getFavoritesByEmployeeQueryCall(employeeId);
		},
		[getFavoritesByEmployeeQueryCall]
	);

	const deleteFavorite = useCallback(
		async (id: ID) => {
			const favoriteId = favorites.find((favorite) => favorite.entityId === id)?.id;
			const res = favoriteId && (await deleteFavoriteQueryCall(favoriteId, user?.employee?.id ?? ''));
			setFavorites((favorites) => favorites.filter((favorite) => favorite.id !== id));
			return res;
		},
		[deleteFavoriteQueryCall, favorites, user?.employee?.id]
	);

	const loadFavorites = useCallback(async () => {
		try {
			const res = await getFavoritesByEmployee(user?.employee?.id || user?.employeeId || '');

			if (res) {
				setFavorites(res.data.items);
				return res;
			} else {
				throw new Error('Could not load favorites');
			}
		} catch (error) {
			console.error('Failed to load favorites', error);
		}
	}, [getFavoritesByEmployee]);

	const handleFirstFavoritesLoad = useCallback(async () => {
		await loadFavorites();
		firstRolesLoad();
	}, [firstRolesLoad, loadFavorites]);

	const toggleFavoriteTask = async (task: ITask) => {
		const isFavoriteTask = task
			? favorites.some((el) => {
					return el.entity === EBaseEntityEnum.Task && el.entityId === task.id;
				})
			: false;
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
		createFavoriteLoading,
		getFavoritesByEmployeeLoading,
		deleteFavoriteLoading,
		firstLoadFavoritesData: handleFirstFavoritesLoad,

		toggleFavoriteTask
	};
};
