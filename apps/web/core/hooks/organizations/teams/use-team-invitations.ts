'use client';

import {
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
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { InviteUserParams, TeamInvitationsQueryParams } from '@/core/types/interfaces/user/invite';

export function useTeamInvitations() {
	const queryClient = useQueryClient();

	const setTeamInvitations = useSetAtom(teamInvitationsState);
	const [myInvitationsList, setMyInvitationsList] = useAtom(myInvitationsState);
	const teamInvitations = useAtomValue(getTeamInvitationsState);
	const [fetchingInvitations, setFetchingInvitations] = useAtom(fetchingTeamInvitationsState);

	const activeTeamId = getActiveTeamIdCookie();
	const { firstLoad, firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();
	const { isTeamManager, refreshToken, user } = useAuthenticateUser();

	// Request params memoized
	const teamInvitationsParams: TeamInvitationsQueryParams | null =
		activeTeamId && user?.tenantId && user?.employee?.organizationId
			? {
					tenantId: user.tenantId,
					organizationId: user.employee.organizationId,
					role: 'EMPLOYEE',
					teamId: activeTeamId
				}
			: null;

	// ===== QUERIES =====

	// Query for team invitations
	const {
		data: teamInvitationsData,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess,
		dataUpdatedAt: teamInvitationsUpdatedAt
	} = useQuery({
		queryKey: queryKeys.users.invitations.team(
			user?.tenantId || '',
			user?.employee?.organizationId || '',
			activeTeamId || ''
		),
		queryFn: async () => {
			if (!teamInvitationsParams) return { items: [] };

			return await inviteService.getTeamInvitations(
				teamInvitationsParams.tenantId,
				teamInvitationsParams.organizationId,
				teamInvitationsParams.role,
				teamInvitationsParams.teamId
			);
		},
		enabled: !!(activeTeamId && isTeamManager && user?.tenantId)
	});

	// Query for my invitations
	const {
		data: myInvitationsData,
		isLoading: myInvitationsLoadingQuery,
		refetch: refetchMyInvitations
	} = useQuery({
		queryKey: queryKeys.users.invitations.all,

		queryFn: async () => {
			if (!user?.tenantId) return { items: [] };
			return await inviteService.getMyInvitations(user.tenantId);
		},
		enabled: !!user?.tenantId, // Disabled by default, enabled manually via refetch
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000 // 5 minutes
	});

	// ===== MUTATIONS =====

	// Mutation to invite a user
	const inviteUserMutation = useMutation({
		mutationFn: async (params: InviteUserParams) => {
			return await inviteService.inviteByEmails(
				{
					email: params.email,
					name: params.name,
					organizationId: params.organizationId,
					teamId: params.teamId
				},
				params.tenantId
			);
		},
		onSuccess: (data) => {
			// Optimistic update of the cache
			const items = data.items || [];
			setTeamInvitations((prev) => [...prev, ...items]);

			// Invalidation of the cache for refetch
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.invitations.team(
					user?.tenantId || '',
					user?.employee?.organizationId || '',
					activeTeamId || ''
				)
			});
		}
	});

	// Mutation to remove an invitation
	const removeInvitationMutation = useMutation({
		mutationFn: async ({ invitationId, email }: { invitationId: string; email?: string }) => {
			if (!teamInvitationsParams) throw new Error('Missing parameters');

			const result = await inviteService.removeTeamInvitations(
				invitationId,
				teamInvitationsParams.tenantId,
				teamInvitationsParams.organizationId,
				teamInvitationsParams.role,
				teamInvitationsParams.teamId
			);

			return { result, email };
		},
		onSuccess: ({ result, email }) => {
			if (email) {
				toast.success('Invitation removed', {
					description: `Invitation removed for ${email}`,
					duration: 5000
				});
			}

			setTeamInvitations(result.items || []);

			// Invalidation of the cache
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.invitations.team(
					user?.tenantId || '',
					user?.employee?.organizationId || '',
					activeTeamId || ''
				)
			});
		}
	});

	// Mutation to resend an invitation
	const resendInvitationMutation = useMutation({
		mutationFn: async (invitationId: string) => {
			return await inviteService.resendTeamInvitations(invitationId);
		},
		onSuccess: () => {
			// Invalidation of the cache for refetch
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.invitations.all
			});
		}
	});

	// Mutation to accept/reject an invitation
	const acceptRejectInvitationMutation = useMutation({
		mutationFn: async ({ id, action }: { id: string; action: EInviteAction }) => {
			return await inviteService.acceptRejectMyInvitations(id, action);
		},
		onSuccess: async (res, { id, action }) => {
			if (res.message) {
				return res.message;
			}

			if (action === EInviteAction.ACCEPTED) {
				await refreshToken();
				window.location.reload();
				return res;
			}

			// Optimistic update of the cache
			setMyInvitationsList((prev) => prev.filter((invitation) => invitation.id !== id));

			// Invalidation of the cache
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.invitations.all
			});

			return res;
		}
	});

	// ===== EFFECTS =====

	// Synchronization with the Jotai stores for compatibility

	useEffect(() => {
		if (teamInvitationsSuccess && teamInvitationsData?.items) {
			setTeamInvitations(teamInvitationsData.items);
		}
	}, [teamInvitationsSuccess, teamInvitationsUpdatedAt]);

	useEffect(() => {
		if (myInvitationsData?.items) {
			setMyInvitationsList(myInvitationsData.items);
		}
	}, [myInvitationsData, setMyInvitationsList]);

	useEffect(() => {
		if (firstLoad) {
			setFetchingInvitations(teamInvitationsLoading);
		}
	}, [teamInvitationsLoading, firstLoad, setFetchingInvitations]);

	// ===== INTERFACE FUNCTIONS =====

	const inviteUser = useCallback(
		(email: string, name: string) => {
			if (!user?.employee?.organizationId || !activeTeamId || !user?.tenantId) {
				return Promise.reject(new Error('Missing required parameters'));
			}

			return inviteUserMutation.mutateAsync({
				email,
				name,
				organizationId: user.employee.organizationId,
				teamId: activeTeamId,
				tenantId: user.tenantId
			});
		},
		[inviteUserMutation, user, activeTeamId]
	);

	const removeTeamInvitation = useCallback(
		(invitationId: string, email?: string) => {
			if (!(activeTeamId && isTeamManager && user?.tenantId)) {
				return;
			}

			removeInvitationMutation.mutate({ invitationId, email });
		},
		[removeInvitationMutation, activeTeamId, isTeamManager, user]
	);

	const resendTeamInvitation = useCallback(
		(invitationId: string) => {
			return resendInvitationMutation.mutateAsync(invitationId);
		},
		[resendInvitationMutation]
	);

	const myInvitations = useCallback(() => {
		if (myInvitationsLoadingQuery || !user?.tenantId) {
			return;
		}

		refetchMyInvitations();
	}, [refetchMyInvitations, user?.tenantId, myInvitationsLoadingQuery]);

	const removeMyInvitation = useCallback(
		(id: string) => {
			setMyInvitationsList((prev) => prev.filter((invitation) => invitation.id !== id));
		},
		[setMyInvitationsList]
	);

	const acceptRejectMyInvitation = useCallback(
		(id: string, action: EInviteAction) => {
			return acceptRejectInvitationMutation.mutateAsync({ id, action });
		},
		[acceptRejectInvitationMutation]
	);
	const hydratedInvitations = useMemo(() => {
		return teamInvitationsData?.items ?? teamInvitations;
	}, [teamInvitationsData?.items, teamInvitations]);
	const hydratedMyInvitations = useMemo(() => {
		return myInvitationsData?.items ?? myInvitationsList;
	}, [myInvitationsData?.items, myInvitationsList]);
	// ===== RETURN =====
	return {
		teamInvitations: hydratedInvitations,
		myInvitationsList: hydratedMyInvitations,
		firstLoadTeamInvitationsData,
		fetchingInvitations,
		inviteLoading: inviteUserMutation.isPending,
		inviteUser,
		removeTeamInvitation,
		resendTeamInvitation,
		removeInviteLoading: removeInvitationMutation.isPending,
		resendInviteLoading: resendInvitationMutation.isPending,
		myInvitationsQueryCall: refetchMyInvitations,
		myInvitationsLoading: myInvitationsLoadingQuery,
		myInvitations,
		removeMyInvitation,
		acceptRejectMyInvitation,
		acceptRejectMyInvitationsLoading: acceptRejectInvitationMutation.isPending
	};
}
