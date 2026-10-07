import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { TJoinTeamRequest } from '@/core/types/schemas';
import { useInvalidateRequestToJoin } from './use-invalidate-request-to-join';

/**
 * Hook for the "request to join" mutation.
 *
 * @returns Object containing:
 * - `requestToJoinTeam` — async function to request joining a team
 * - `requestToJoinLoading` — whether the mutation is pending
 * - `requestToJoinQueryCall` — backward compat wrapper returning `{ data }`
 * - `requestToJoinMutation` — raw React Query mutation for advanced usage
 */
export function useRequestToJoinMutation() {
	const { invalidateRequestToJoinData } = useInvalidateRequestToJoin();

	const requestToJoinMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.request,
		mutationFn: async (data: TJoinTeamRequest) => {
			return await requestToJoinTeamService.requestToJoin(data);
		},
		onSuccess: invalidateRequestToJoinData
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const requestToJoinMutateAsync = requestToJoinMutation.mutateAsync;
	const requestToJoinTeam = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await requestToJoinMutateAsync(data);
			return result;
		},
		[requestToJoinMutateAsync]
	);

	const requestToJoinQueryCall = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await requestToJoinMutateAsync(data);
			return { data: result };
		},
		[requestToJoinMutateAsync]
	);

	return {
		requestToJoinTeam,
		requestToJoinLoading: requestToJoinMutation.isPending,
		requestToJoinQueryCall,
		requestToJoinMutation
	};
}

