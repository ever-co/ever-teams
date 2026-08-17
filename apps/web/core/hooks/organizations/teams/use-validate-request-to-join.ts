import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { TValidateRequestToJoinTeam } from '@/core/types/schemas';
import { toast } from 'sonner';

/**
 * Hook for the "validate request to join" mutation.
 *
 * @returns Object containing:
 * - `validateRequestToJoinTeam` — async function to validate a join request
 * - `validateRequestToJoinLoading` — whether the mutation is pending
 * - `validateRequestToJoinQueryCall` — backward compat wrapper returning `{ data }`
 * - `validateRequestToJoinMutation` — raw React Query mutation for advanced usage
 */
export function useValidateRequestToJoin() {
	const validateRequestToJoinMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.validate,
		mutationFn: async (data: TValidateRequestToJoinTeam) => {
			return await requestToJoinTeamService.validateRequestToJoin(data);
		},
		onSuccess: () => {
			toast.success('Request validated successfully', {
				description: 'You can now join the team'
			});
		},
		onError: (error: any) => {
			toast.error('Failed to validate request', {
				description: error instanceof Error ? error.message : 'Please try again later'
			});
		}
	});

	const validateRequestToJoinMutateAsync = validateRequestToJoinMutation.mutateAsync;
	const validateRequestToJoinTeam = useCallback(
		async (data: TValidateRequestToJoinTeam) => {
			const result = await validateRequestToJoinMutateAsync(data);
			return result;
		},
		[validateRequestToJoinMutateAsync]
	);

	const validateRequestToJoinQueryCall = useCallback(
		async (data: TValidateRequestToJoinTeam) => {
			const result = await validateRequestToJoinMutateAsync(data);
			return { data: result };
		},
		[validateRequestToJoinMutateAsync]
	);

	return {
		validateRequestToJoinTeam,
		validateRequestToJoinLoading: validateRequestToJoinMutation.isPending,
		validateRequestToJoinQueryCall,
		validateRequestToJoinMutation
	};
}

