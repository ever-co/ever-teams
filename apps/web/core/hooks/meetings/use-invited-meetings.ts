'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduledMeetingService } from '@/core/services/client/api/meetings';
import { queryKeys } from '@/core/query/keys';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { invitedMeetingOf, type ScheduledMeeting } from '@/core/lib/utils/meetings';
import { useUserQuery } from '../queries/user-user.query';

/** How far back the agenda can show a meeting one was invited to. */
const INVITED_HISTORY_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * How often an open agenda reads the invitations again: a host moves, cancels or adds a meeting at any time, and the
 * invitee's open page should show it within a minute, as their Inbox does.
 */
export const INVITED_MEETINGS_REFRESH_MS = 60 * 1000;

const isMeeting = (meeting: ScheduledMeeting | null): meeting is ScheduledMeeting => meeting !== null;

/**
 * A platform without the route lists no invitations, which is no failure. An older Ever Gauzy reads `invited` as the
 * id of `GET /employee-appointment/:id`, whose UUID check answers 406 (`NotAcceptableException`); a platform with
 * neither route answers 404.
 */
const MISSING_ROUTE_STATUSES: ReadonlySet<number> = new Set([404, 406]);

function isInvitationsRouteMissing(error: unknown): boolean {
	const status = errorStatusOf(error);
	return status !== null && MISSING_ROUTE_STATUSES.has(status);
}

/**
 * The meetings others host that the signed-in member is invited to (#5022), from a month ago on, read again every
 * minute while the page is open and when it comes back to the front. A platform that does not list them yet answers
 * 404 or 406: the member then sees their own meetings only, as before, and nothing says it failed. Any other failure
 * is one, which the agenda shows with a way to try again.
 */
export function useInvitedMeetings() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';

	const query = useQuery({
		queryKey: queryKeys.meetings.invited(employeeId),
		queryFn: () => scheduledMeetingService.getInvitedMeetings(new Date(Date.now() - INVITED_HISTORY_MS)),
		enabled: Boolean(employeeId),
		staleTime: 30 * 1000,
		refetchInterval: INVITED_MEETINGS_REFRESH_MS,
		refetchOnWindowFocus: true,
		// A missing route stays missing: asked once. A passing failure is asked again, as every query is.
		retry: (failureCount, error) => !isInvitationsRouteMissing(error) && failureCount < 2
	});

	const meetings = useMemo(() => (query.data ?? []).map(invitedMeetingOf).filter(isMeeting), [query.data]);
	const isError = query.isError && !isInvitationsRouteMissing(query.error);

	return { meetings, isLoading: query.isLoading, isError, refetch: query.refetch };
}
