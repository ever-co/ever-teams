import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { ERequestStatus } from '@/core/types/generics/enums';
import { toast } from 'sonner';
import { useInvalidateRequestToJoin } from './use-invalidate-request-to-join';

/**
 * Hook for the "accept/reject" mutation.
 *
 * @returns Object containing:
 * - `acceptRejectRequestToJoin` — async function(id, action) to accept or reject a request
 * - `acceptRejectRequestToJoinLoading` — whether the mutation is pending
 * - `acceptRejectMutation` — raw React Query mutation for advanced usage
 */
export function useAcceptRejectRequestToJoin() {
	const { invalidateRequestToJoinData } = useInvalidateRequestToJoin();

	const acceptRejectMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.acceptReject,
		mutationFn: async ({ id, action }: { id: string; action: ERequestStatus }) => {
			return await requestToJoinTeamService.acceptRejectRequestToJoin({ id, action });
		},
		onSuccess: () => {
			invalidateRequestToJoinData();
			toast.success('Request accepted/rejected successfully', {
				description: 'The request has been successfully processed.'
			});
		},
		onError: () => {
			toast.error('Failed to accept/reject request', {
				description: 'Please try again later'
			});
		}
	});

	const acceptRejectRequestToJoin = useCallback(
		async (id: string, action: ERequestStatus) => {
			await acceptRejectMutation.mutateAsync({ id, action });
		},
		[acceptRejectMutation]
	);

	return {
		acceptRejectRequestToJoin,
		acceptRejectRequestToJoinLoading: acceptRejectMutation.isPending,
		acceptRejectMutation
	};
}

