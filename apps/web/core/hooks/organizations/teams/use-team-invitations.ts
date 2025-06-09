'use client';
import {
	activeTeamIdState,
	fetchingTeamInvitationsState,
	getTeamInvitationsState,
	myInvitationsState,
	teamInvitationsState
} from '@/core/stores';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../../common/use-first-load';
import { inviteService } from '../../../services/client/api/organizations/teams/invites';
import { useAuthenticateUser } from '../../auth';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { toast } from 'sonner';
import { queryKeys } from '@/core/query/keys';

export function useTeamInvitations() {
	const setTeamInvitations = useSetAtom(teamInvitationsState);
	const [myInvitationsList, setMyInvitationsList] = useAtom(myInvitationsState);

	const teamInvitations = useAtomValue(getTeamInvitationsState);
	const [, setFetchingInvitations] = useAtom(fetchingTeamInvitationsState);

	const activeTeamId = useAtomValue(activeTeamIdState);
	const { firstLoad, firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();

	const { isTeamManager, refreshToken, user } = useAuthenticateUser();
	const queryClient = useQueryClient();

	// Memoized parameters for React Query
	const tenantId = useMemo(() => user?.tenantId, [user?.tenantId]);
	const organizationId = useMemo(() => user?.employee?.organizationId, [user?.employee?.organizationId]);
	const invalidateTeamInvitations = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.users.invitations.team(tenantId, organizationId, activeTeamId)
		});
	}, [queryClient, tenantId, organizationId, activeTeamId]);
	const isEnabled = useMemo(
		() => !!(tenantId && organizationId && activeTeamId && isTeamManager),
		[tenantId, organizationId, activeTeamId, isTeamManager]
	);
	// React Query Mutations
	const inviteMutation = useMutation({
		mutationFn: ({
			data,
			tenantId
		}: {
			data: { email: string; name: string; organizationId: string; teamId: string };
			tenantId: string;
		}) => inviteService.inviteByEmails(data, tenantId),
		onSuccess: (result) => {
			// Invalidate and refetch team invitations
			invalidateTeamInvitations();
			// Update Jotai state for backward compatibility with transformed data
			if (result.items) {
				setTeamInvitations((prev) => [...prev, ...result.items]);
			}
		},
		onError: (error) => {
			toast.error('Failed to send invitation', {
				description: error instanceof Error ? error.message : 'An error occurred'
			});
		}
	});

	const removeInviteMutation = useMutation({
		mutationFn: ({
			invitationId,
			tenantId,
			organizationId,
			role,
			teamId
		}: {
			invitationId: string;
			tenantId: string;
			organizationId: string;
			role: string;
			teamId: string;
		}) => inviteService.removeTeamInvitations(invitationId, tenantId, organizationId, role, teamId),
		onSuccess: (result) => {
			// Invalidate and refetch team invitations
			invalidateTeamInvitations();
			// Update Jotai state for backward compatibility with transformed data
			if (result.items) {
				setTeamInvitations(result.items);
			}
		},
		onError: (error) => {
			toast.error('Failed to remove invitation', {
				description: error instanceof Error ? error.message : 'An error occurred'
			});
		}
	});

	const resendInviteMutation = useMutation({
		mutationFn: (inviteId: string) => inviteService.resendTeamInvitations(inviteId),
		onSuccess: () => {
			// Invalidate and refetch team invitations to get fresh data
			invalidateTeamInvitations();
		},
		onError: (error) => {
			toast.error('Failed to resend invitation', {
				description: error instanceof Error ? error.message : 'An error occurred'
			});
		}
	});

	const acceptRejectMutation = useMutation({
		mutationFn: ({ invitationId, action }: { invitationId: string; action: EInviteAction }) =>
			inviteService.acceptRejectMyInvitations(invitationId, action),
		onSuccess: (result, variables) => {
			if (result.message) {
				return result;
			}

			if (variables.action === EInviteAction.ACCEPTED) {
				refreshToken().then(() => {
					window.location.reload();
				});
			}

			// Invalidate my invitations
			queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.my(tenantId) });
			// Update Jotai state for backward compatibility
			setMyInvitationsList((prev) => prev.filter((invitation) => invitation.id !== variables.invitationId));
		},
		onError: (error) => {
			toast.error('Failed to process invitation', {
				description: error instanceof Error ? error.message : 'An error occurred'
			});
		}
	});

	// React Query: Get Team Invitations
	const { data: teamInvitationsData, isLoading: teamInvitationsLoading } = useQuery({
		queryKey: queryKeys.users.invitations.team(tenantId, organizationId, activeTeamId),
		queryFn: () => inviteService.getTeamInvitations(tenantId!, organizationId!, 'EMPLOYEE', activeTeamId!),
		enabled: isEnabled,
		staleTime: 30000, // 30 seconds
		refetchOnWindowFocus: false
	});

	// React Query: Get My Invitations
	const { data: myInvitationsData, isLoading: myInvitationsLoading } = useQuery({
		queryKey: queryKeys.users.invitations.my(tenantId),
		queryFn: () => inviteService.getMyInvitations(tenantId!),
		enabled: !!tenantId,
		staleTime: 30000, // 30 seconds
		refetchOnWindowFocus: false
	});

	// Synchronize React Query data with Jotai stores
	useEffect(() => {
		if (teamInvitationsData?.items) {
			setTeamInvitations(teamInvitationsData.items);
		}
	}, [teamInvitationsData, setTeamInvitations]);

	useEffect(() => {
		if (myInvitationsData?.items) {
			setMyInvitationsList(myInvitationsData.items);
		}
	}, [myInvitationsData, setMyInvitationsList]);

	// Update fetching state for backward compatibility
	useEffect(() => {
		if (firstLoad) {
			setFetchingInvitations(teamInvitationsLoading);
		}
	}, [teamInvitationsLoading, firstLoad, setFetchingInvitations]);

	const inviteUser = useCallback(
		(email: string, name: string) => {
			if (!user?.tenantId || !user?.employee?.organizationId || !activeTeamId) {
				return Promise.reject(new Error('Missing required parameters'));
			}

			return inviteMutation.mutateAsync({
				data: {
					email,
					name,
					organizationId: user.employee.organizationId,
					teamId: activeTeamId
				},
				tenantId: user.tenantId
			});
		},
		[inviteMutation, user?.tenantId, user?.employee?.organizationId, activeTeamId]
	);

	// Legacy useEffect removed - React Query handles data fetching automatically

	const removeTeamInvitation = useCallback(
		(invitationId: string, email?: string | null) => {
			if (!(activeTeamId && isTeamManager && user?.tenantId && user?.employee?.organizationId)) {
				return Promise.reject(new Error('Missing required parameters'));
			}

			return removeInviteMutation
				.mutateAsync({
					invitationId,
					tenantId: user.tenantId,
					organizationId: user.employee.organizationId,
					role: 'EMPLOYEE',
					teamId: activeTeamId
				})
				.then((result) => {
					if (email) {
						toast.success('Invitation removed', {
							description: `Invitation removed for ${email}`,
							duration: 5000
						});
					}
					return result;
				});
		},
		[removeInviteMutation, activeTeamId, isTeamManager, user?.tenantId, user?.employee?.organizationId]
	);

	const resendTeamInvitation = useCallback(
		(invitationId: string) => {
			return resendInviteMutation.mutateAsync(invitationId);
		},
		[resendInviteMutation]
	);

	const myInvitations = useCallback(() => {
		// React Query handles this automatically - this function is kept for backward compatibility
		// Data is already available in myInvitationsData and synchronized with myInvitationsList
		if (!tenantId) {
			return;
		}
		// Trigger a refetch if needed
		queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations.my(tenantId) });
	}, [queryClient, tenantId]);
	const removeMyInvitation = useCallback(
		(id: string) => {
			setMyInvitationsList(myInvitationsList.filter((invitation) => invitation.id !== id));
		},
		[myInvitationsList, setMyInvitationsList]
	);
	const acceptRejectMyInvitation = useCallback(
		(id: string, action: EInviteAction) => {
			return acceptRejectMutation.mutateAsync({
				invitationId: id,
				action
			});
		},
		[acceptRejectMutation]
	);

	return {
		// Data from React Query (preferred)
		teamInvitations: teamInvitationsData?.items || teamInvitations, // Fallback to Jotai for backward compatibility
		myInvitationsList: myInvitationsData?.items || myInvitationsList, // Fallback to Jotai for backward compatibility

		// Loading states from React Query
		fetchingInvitations: teamInvitationsLoading,
		myInvitationsLoading,

		// Legacy compatibility
		firstLoadTeamInvitationsData,

		// Mutation functions with React Query
		inviteLoading: inviteMutation.isPending,
		inviteUser,
		removeTeamInvitation,
		resendTeamInvitation,
		removeInviteLoading: removeInviteMutation.isPending,
		resendInviteLoading: resendInviteMutation.isPending,
		myInvitations,
		removeMyInvitation,
		acceptRejectMyInvitation,
		acceptRejectMyInvitationsLoading: acceptRejectMutation.isPending,

		// Legacy function kept for backward compatibility
		myInvitationsQueryCall: myInvitations
	};
}
