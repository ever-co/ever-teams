'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook providing shared cache invalidation logic for task versions.
 */
export function useInvalidateTaskVersions() {
	const queryClient = useQueryClient();
	const activeTeamId = getActiveTeamIdCookie();

	const invalidateTaskVersionsData = useCallback(
		() =>
			activeTeamId
				? queryClient.invalidateQueries({
						queryKey: queryKeys.taskVersions.byTeam(activeTeamId)
					})
				: Promise.resolve(),
		[queryClient, activeTeamId]
	);

	return { invalidateTaskVersionsData, queryClient, activeTeamId };
}

