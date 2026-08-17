import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { TJoinTeamRequest } from '@/core/types/schemas';
import { toast } from 'sonner';

/**
 * Hook for the "resend code" mutation.
 *
 * @returns Object containing:
 * - `resendCodeRequestToJoinTeam` — async function to resend the join code
 * - `resendCodeRequestToJoinLoading` — whether the mutation is pending
 * - `resendCodeRequestToJoinQueryCall` — backward compat wrapper returning `{ data }`
 * - `resendCodeMutation` — raw React Query mutation for advanced usage
 */
export function useResendCodeRequestToJoin() {
	const resendCodeMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.resendCode,
		mutationFn: async (data: TJoinTeamRequest) => {
			return await requestToJoinTeamService.resendCodeRequestToJoin(data);
		},
		onSuccess: () => {
			toast.success('Code resent successfully', {
				description: 'The code has been successfully resent.'
			});
		},
		onError: () => {
			toast.error('Failed to resend code. Please try again later.');
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const resendCodeMutateAsync = resendCodeMutation.mutateAsync;
	const resendCodeRequestToJoinTeam = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutateAsync(data);
			return result;
		},
		[resendCodeMutateAsync]
	);

	const resendCodeRequestToJoinQueryCall = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutateAsync(data);
			return { data: result };
		},
		[resendCodeMutateAsync]
	);

	return {
		resendCodeRequestToJoinTeam,
		resendCodeRequestToJoinLoading: resendCodeMutation.isPending,
		resendCodeRequestToJoinQueryCall,
		resendCodeMutation
	};
}

