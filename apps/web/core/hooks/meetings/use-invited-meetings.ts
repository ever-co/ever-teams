'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduledMeetingService } from '@/core/services/client/api/meetings';
import { queryKeys } from '@/core/query/keys';
import { invitedMeetingOf, type ScheduledMeeting } from '@/core/lib/utils/meetings';
import { useUserQuery } from '../queries/user-user.query';

/** How far back the agenda can show a meeting one was invited to. */
const INVITED_LOOKBACK_MS = 31 * 24 * 60 * 60 * 1000;

const isMeeting = (meeting: ScheduledMeeting | null): meeting is ScheduledMeeting => meeting !== null;

/**
 * The meetings others host that the signed-in member is invited to (#5022), from a month ago on. A platform that does
 * not list them yet (an older Ever Gauzy) answers with an error: the member then sees their own meetings only, as
 * before, so the error is not shown.
 */
export function useInvitedMeetings() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';

	const query = useQuery({
		queryKey: queryKeys.meetings.invited(employeeId),
		queryFn: () => scheduledMeetingService.getInvitedMeetings(new Date(Date.now() - INVITED_LOOKBACK_MS)),
		enabled: Boolean(employeeId),
		staleTime: 60 * 1000,
		retry: false
	});

	const meetings = useMemo(() => (query.data ?? []).map(invitedMeetingOf).filter(isMeeting), [query.data]);

	return { meetings, isLoading: query.isLoading };
}
