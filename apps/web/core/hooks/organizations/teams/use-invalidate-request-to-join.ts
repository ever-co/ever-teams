import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook providing shared cache invalidation logic for request-to-join data.
 */
export function useInvalidateRequestToJoin() {
	const queryClient = useQueryClient();

	const invalidateRequestToJoinData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.requestToJoin.list() }),
		[queryClient]
	);

	return { invalidateRequestToJoinData, queryClient };
}

