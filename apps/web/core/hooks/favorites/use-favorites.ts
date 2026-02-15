import { useFavoritesQuery } from './use-favorites-query';
import { useCreateFavorite } from './use-create-favorite';
import { useDeleteFavorite } from './use-delete-favorite';

/**
 * @deprecated Use granular hooks instead:
 * - `useFavoritesQuery()` for reading favorites
 * - `useCreateFavorite()` for creating a favorite
 * - `useDeleteFavorite()` for deleting a favorite
 * - `useInvalidateFavorites()` for cache invalidation
 */
export const useFavorites = () => {
	const { currentEmployeeFavorites, isLoading } = useFavoritesQuery();
	const { createFavorite, createFavoriteLoading } = useCreateFavorite();
	const { deleteFavorite, deleteFavoriteLoading } = useDeleteFavorite();

	return {
		currentEmployeeFavorites,

		// Methods
		createFavorite,
		deleteFavorite,

		// Loading states
		loading: isLoading,
		createFavoriteLoading,
		deleteFavoriteLoading
	};
};
