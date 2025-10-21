import { requestToJoinState } from '@/core/stores';
import { useCallback, useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';

import { ERequestStatus } from '@/core/types/generics/enums';
import { queryKeys } from '@/core/query/keys';
import { TJoinTeamRequest, TValidateRequestToJoinTeam } from '@/core/types/schemas';
import { toast } from 'sonner';

export const useRequestToJoinTeam = () => {
	const [requestToJoin, setRequestToJoin] = useAtom(requestToJoinState);
	const queryClient = useQueryClient();

	// React Query for GET operation
	const requestToJoinQuery = useQuery({
		queryKey: queryKeys.organizationTeams.requestToJoin.list(),
		queryFn: async () => {
			return await requestToJoinTeamService.getRequestToJoin();
		},
		staleTime: 1000 * 60 * 5, // 5 minutes - request data changes moderately
		gcTime: 1000 * 60 * 15, // 15 minutes - useful for navigation
		retry: 2
	});

	//Synchronize React Query data with Jotai state
	useEffect(() => {
		if (requestToJoinQuery.data?.items) {
			setRequestToJoin(requestToJoinQuery.data.items);
		}
	}, [requestToJoinQuery.data?.items, setRequestToJoin]);

	// React Query mutations
	const requestToJoinMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.request,
		mutationFn: async (data: TJoinTeamRequest) => {
			return await requestToJoinTeamService.requestToJoin(data);
		},
		onSuccess: () => {
			// Invalidate and refetch request list
			queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.requestToJoin.list() });
		}
	});

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

	const acceptRejectMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.acceptReject,
		mutationFn: async ({ id, action }: { id: string; action: ERequestStatus }) => {
			return await requestToJoinTeamService.acceptRejectRequestToJoin({ id, action });
		},
		onSuccess: () => {
			// Invalidate and refetch request list
			queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.requestToJoin.list() });
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

	// Backward compatible wrapper functions
	const getRequestToJoin = useCallback(async () => {
		try {
			// Check if data is fresh, use cache if available
			if (requestToJoinQuery.data && !requestToJoinQuery.isStale) {
				return { data: requestToJoinQuery.data };
			}

			// Refetch if stale or missing
			const result = await requestToJoinQuery.refetch();
			return { data: result.data };
		} catch (error) {
			// Fallback to cached data if available
			if (requestToJoinQuery.data) {
				return { data: requestToJoinQuery.data };
			}
			throw error;
		}
	}, [requestToJoinQuery]);

	const requestToJoinTeam = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await requestToJoinMutation.mutateAsync(data);
			return result;
		},
		[requestToJoinMutation]
	);

	const validateRequestToJoinTeam = useCallback(
		async (data: TValidateRequestToJoinTeam) => {
			const result = await validateRequestToJoinMutation.mutateAsync(data);
			return result;
		},
		[validateRequestToJoinMutation]
	);

	const resendCodeRequestToJoinTeam = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutation.mutateAsync(data);
			return result;
		},
		[resendCodeMutation]
	);

	const acceptRejectRequestToJoin = useCallback(
		async (id: string, action: ERequestStatus) => {
			await acceptRejectMutation.mutateAsync({ id, action });
			// Data will be automatically refetched due to onSuccess invalidation
		},
		[acceptRejectMutation]
	);

	// Memoized loading states for backward compatibility
	const requestToJoinLoading = useMemo(() => requestToJoinMutation.isPending, [requestToJoinMutation.isPending]);
	const validateRequestToJoinLoading = useMemo(
		() => validateRequestToJoinMutation.isPending,
		[validateRequestToJoinMutation.isPending]
	);
	const resendCodeRequestToJoinLoading = useMemo(() => resendCodeMutation.isPending, [resendCodeMutation.isPending]);
	const getRequestToJoinLoading = useMemo(() => requestToJoinQuery.isLoading, [requestToJoinQuery.isLoading]);
	const acceptRejectRequestToJoinLoading = useMemo(
		() => acceptRejectMutation.isPending,
		[acceptRejectMutation.isPending]
	);

	// Backward compatible queryCall functions (deprecated but maintained)
	const requestToJoinQueryCall = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await requestToJoinMutation.mutateAsync(data);
			return { data: result };
		},
		[requestToJoinMutation]
	);

	const validateRequestToJoinQueryCall = useCallback(
		async (data: TValidateRequestToJoinTeam) => {
			const result = await validateRequestToJoinMutation.mutateAsync(data);
			return { data: result };
		},
		[validateRequestToJoinMutation]
	);

	const resendCodeRequestToJoinQueryCall = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutation.mutateAsync(data);
			return { data: result };
		},
		[resendCodeMutation]
	);

	return {
		// Backward compatible interface - exact same as before
		requestToJoinLoading,
		requestToJoinQueryCall,
		validateRequestToJoinLoading,
		validateRequestToJoinQueryCall,
		resendCodeRequestToJoinLoading,
		resendCodeRequestToJoinQueryCall,
		requestToJoinTeam,
		validateRequestToJoinTeam,
		resendCodeRequestToJoinTeam,
		getRequestToJoin,
		getRequestToJoinLoading,
		requestToJoin,
		acceptRejectRequestToJoin,
		acceptRejectRequestToJoinLoading,

		// Additional React Query states for advanced usage
		requestToJoinQuery,
		requestToJoinMutation,
		validateRequestToJoinMutation,
		resendCodeMutation,
		acceptRejectMutation
	};
};
