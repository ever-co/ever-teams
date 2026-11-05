'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import isEqual from 'lodash/isEqual';
import { SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { employeeIdsTrackingOutsideTeam, todaySecondsWithoutTeam } from '@/core/lib/helpers/team-member-tracking';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers';
import { activeTeamState } from '@/core/stores';

const trackingOutsideTeamAtom = selectAtom(
	activeTeamState,
	(activeTeam) => employeeIdsTrackingOutsideTeam(activeTeam?.members),
	isEqual
);

/**
 * Today's seconds of the member's running timer when it has no team, which the team's totals leave out. Every card
 * shares one read of the last logs of the members tracking outside the team, and none when nobody does.
 */
export function useTodaySecondsWithoutTeam(employeeId: string | null | undefined): number {
	const employeeIds = useAtomValue(trackingOutsideTeamAtom);
	const employeeIdsKey = employeeIds.join(',');
	const { data: statuses } = useQuery({
		queryKey: queryKeys.timer.lastLogsOf(employeeIdsKey),
		queryFn: async () => {
			const response = await timerService.getLastTimerLogsOf(employeeIds);
			return response.data;
		},
		enabled: employeeIds.length > 0,
		staleTime: SYNC_TIMER_INTERVAL,
		refetchInterval: SYNC_TIMER_INTERVAL,
		refetchIntervalInBackground: false
	});

	if (!employeeId) {
		return 0;
	}
	const isTrackingOutsideTeam = employeeIds.includes(employeeId);
	if (!isTrackingOutsideTeam) {
		return 0;
	}

	const status = statuses?.find((memberStatus) => memberStatus.lastLog?.employeeId === employeeId);
	return todaySecondsWithoutTeam(status, new Date());
}
