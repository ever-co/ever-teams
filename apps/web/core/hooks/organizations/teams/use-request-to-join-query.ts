import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for reading request-to-join data.
 *
 * @returns Object containing:
 * - `requestToJoin` — memoized array of join requests (stable reference)
 * - `getRequestToJoinLoading` — loading state
 * - `getRequestToJoin` — refetch function (backward compat)
 * - `requestToJoinQuery` — raw React Query object for advanced usage
 */
export function useRequestToJoinQuery() {
	const requestToJoinQuery = useQuery({
		queryKey: queryKeys.organizationTeams.requestToJoin.list(),
		queryFn: async () => {
			return await requestToJoinTeamService.getRequestToJoin();
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
		retry: 2
	});

	const requestToJoin = useMemo(
		() => requestToJoinQuery.data?.items ?? [],
		[requestToJoinQuery.data?.items]
	);

	const getRequestToJoin = useCallback(async () => {
		const result = await requestToJoinQuery.refetch();
		return { data: result.data };
	}, [requestToJoinQuery.refetch]);

	return {
		requestToJoin,
		getRequestToJoin,
		getRequestToJoinLoading: requestToJoinQuery.isLoading,
		requestToJoinQuery
	};
}

