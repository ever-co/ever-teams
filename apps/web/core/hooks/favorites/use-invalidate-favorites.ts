'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Shared invalidation hook for favorites cache.
 * Used by all favorite mutation hooks to ensure cache consistency.
 */
export function useInvalidateFavorites() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';

	const invalidateFavorites = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.favorites.byEmployee(employeeId) }),
		[queryClient, employeeId]
	);

	return { invalidateFavorites };
}

