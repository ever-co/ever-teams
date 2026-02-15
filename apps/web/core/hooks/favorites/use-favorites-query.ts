'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { favoriteService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook for reading current employee favorites (READ only).
 * Replaces direct `useAtomValue(currentEmployeeFavoritesState)` usage.
 *
 * @returns Object containing currentEmployeeFavorites array and loading state
 */
export function useFavoritesQuery() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';

	const {
		data: favoritesData,
		isLoading,
		isSuccess
	} = useQuery({
		queryKey: queryKeys.favorites.byEmployee(employeeId),
		queryFn: () => favoriteService.getFavoritesByEmployee({ employeeId }),
		enabled: Boolean(employeeId),
		staleTime: 30 * 60 * 1000, // 30 minutes
		gcTime: 60 * 60 * 1000 // 1 hour
	});

	// Stable memoized reference — prevents re-render cascades in consumers
	const currentEmployeeFavorites = useMemo(
		() => (isSuccess ? (favoritesData?.items ?? []) : []),
		[favoritesData?.items, isSuccess]
	);

	return {
		currentEmployeeFavorites,
		isLoading,
		isSuccess
	};
}

