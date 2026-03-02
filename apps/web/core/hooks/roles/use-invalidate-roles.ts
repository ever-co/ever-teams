'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Shared invalidation hook for roles cache.
 * Used by all role mutation hooks to ensure cache consistency.
 */
export function useInvalidateRoles() {
	const queryClient = useQueryClient();

	const invalidateRoles = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
		[queryClient]
	);

	return { invalidateRoles };
}

