'use client';

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Send } from '@/core/components/icons';
import { toastMoment } from '@/core/components/common/toast-moment';
import { organizationTeamsState } from '@/core/stores';
import { ERequestStatus } from '@/core/types/generics/enums';
import { isOpenInvitation, type PendingInvitation } from '@/core/lib/utils/invitation-state';
import { dateOrNull } from '@/core/lib/utils/settings-team';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useSendTeamInvitation } from '@/core/hooks/invitations/use-send-team-invitation';
import { useRemoveTeamInvitation } from '@/core/hooks/invitations/use-remove-team-invitation';
import { useRequestToJoinQuery } from '@/core/hooks/organizations/teams/use-request-to-join-query';
import { useAcceptRejectRequestToJoin } from '@/core/hooks/organizations/teams/use-accept-reject-request-to-join';

export type JoinRequestState = 'requested' | 'accepted' | 'rejected' | 'unconfirmed';

/** Gauzy moves a request to REQUESTED once the person confirmed their address; only those can be answered. */
const REQUESTED_STATUS = 'REQUESTED';

export interface JoinRequestModel {
	id: string;
	name: string;
	email: string;
	teamName: string | null;
	requestedAt: Date | null;
	state: JoinRequestState;
}

function joinRequestStateOf(status: string | null | undefined): JoinRequestState {
	if (status === REQUESTED_STATUS) {
		return 'requested';
	}
	if (status === ERequestStatus.ACCEPTED) {
		return 'accepted';
	}
	if (status === ERequestStatus.REJECTED) {
		return 'rejected';
	}
	return 'unconfirmed';
}

function compareJoinRequests(left: JoinRequestModel, right: JoinRequestModel): number {
	const leftIsOpen = left.state === 'requested';
	const rightIsOpen = right.state === 'requested';
	if (leftIsOpen !== rightIsOpen) {
		return Number(rightIsOpen) - Number(leftIsOpen);
	}
	const leftTime = left.requestedAt?.getTime() ?? 0;
	const rightTime = right.requestedAt?.getTime() ?? 0;
	return rightTime - leftTime;
}

export function usePendingInvitationsSettings() {
	const t = useTranslations();
	const { teamInvitations, isLoading, isError, refetch } = useTeamInvitationsQuery();
	const { resendTeamInvitation } = useSendTeamInvitation();
	const { removeTeamInvitation } = useRemoveTeamInvitation();
	const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

	const invitations = useMemo(
		() => (teamInvitations as PendingInvitation[]).filter(isOpenInvitation),
		[teamInvitations]
	);

	const runFor = useCallback(async (invitationId: string, action: () => Promise<unknown>) => {
		setBusyIds((current) => new Set(current).add(invitationId));
		try {
			await action();
		} finally {
			setBusyIds((current) => {
				const next = new Set(current);
				next.delete(invitationId);
				return next;
			});
		}
	}, []);

	const resend = useCallback(
		async (invitation: PendingInvitation) => {
			const invitationId = invitation.id;
			if (!invitationId) {
				return;
			}
			try {
				await runFor(invitationId, () => resendTeamInvitation(invitationId));
				toastMoment(t('toasts.invites.SENT', { email: invitation.email ?? '' }), createElement(Send));
			} catch {
				// The mutation reports the failure
			}
		},
		[resendTeamInvitation, runFor, t]
	);

	const revoke = useCallback(
		async (invitation: PendingInvitation) => {
			const invitationId = invitation.id;
			if (!invitationId) {
				return;
			}
			await runFor(invitationId, () => removeTeamInvitation(invitationId, invitation.email ?? undefined));
		},
		[removeTeamInvitation, runFor]
	);

	return {
		invitations,
		isLoading,
		isError,
		retry: refetch,
		busyIds,
		resend,
		revoke
	};
}

/** Gauzy lists join requests organization wide, every team included. */
export function useJoinRequestsSettings() {
	const teams = useAtomValue(organizationTeamsState);
	const { requestToJoin, requestToJoinQuery } = useRequestToJoinQuery();
	const { acceptRejectRequestToJoin } = useAcceptRejectRequestToJoin();
	const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
	const { refetch, isSuccess } = requestToJoinQuery;
	const hadCachedRequests = useRef(isSuccess);

	// The former page read the requests again on every visit; a first visit is already reading them
	useEffect(() => {
		if (hadCachedRequests.current) {
			refetch();
		}
	}, [refetch]);

	const requests = useMemo<JoinRequestModel[]>(() => {
		const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
		const models = requestToJoin.map((request) => ({
			id: request.id,
			name: request.fullName || request.email,
			email: request.email,
			teamName: teamNameById.get(request.organizationTeamId) ?? null,
			requestedAt: dateOrNull(request.createdAt),
			state: joinRequestStateOf(request.status)
		}));
		return models.sort(compareJoinRequests);
	}, [requestToJoin, teams]);

	const answer = useCallback(
		async (requestId: string, action: ERequestStatus) => {
			setBusyIds((current) => new Set(current).add(requestId));
			try {
				await acceptRejectRequestToJoin(requestId, action);
			} catch {
				// The mutation reports the failure
			} finally {
				setBusyIds((current) => {
					const next = new Set(current);
					next.delete(requestId);
					return next;
				});
			}
		},
		[acceptRejectRequestToJoin]
	);

	const accept = useCallback((requestId: string) => answer(requestId, ERequestStatus.ACCEPTED), [answer]);
	const reject = useCallback((requestId: string) => answer(requestId, ERequestStatus.REJECTED), [answer]);

	return {
		requests,
		isLoading: requestToJoinQuery.isLoading,
		isError: requestToJoinQuery.isError,
		retry: refetch,
		busyIds,
		accept,
		reject
	};
}
