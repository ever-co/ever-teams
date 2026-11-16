'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { requestDaysOf } from '@/core/lib/utils/calendar-view';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { isLogOfEmployee, requestRangeOf } from '@/core/lib/utils/dashboards/team-day';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;
const NO_LOGS: ITimeLog[] = [];

/** The logs with the period and the workspace they were read for. */
interface TeamPeriodLogs {
	logs: ITimeLog[];
	period: Period;
	scopeKey: string;
}

async function fetchTeamLogs(
	startDate: string,
	endDate: string,
	timeZone: string,
	employeeIds: string[],
	period: Period,
	scopeKey: string
): Promise<TeamPeriodLogs> {
	const logs = await timeLogService.getTimeLogs({ startDate, endDate, timeZone, employeeIds });
	return { logs: logs ?? NO_LOGS, period, scopeKey };
}

/** Another period or member set of the same workspace keeps the logs on screen until its own come (#5353). */
function previousOfSameScope(previous: TeamPeriodLogs | undefined, scopeKey: string) {
	const isSameScope = previous?.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

/**
 * The team's time logs with their start and end, over the period and today (the day timeline always shows today).
 * The daily report only has totals per day; the timeline and the hour heatmap need the hours. Read on the time-log
 * list and under its key family, so every add, edit and delete refreshes it. The list's bounds are midnight UTC of
 * the dates, so one more day is asked on each side and the helpers keep what starts inside.
 *
 * Everything shown derives from the read's own request: while another period or member set is read, the previous
 * logs stay with their own period (the heatmap is never drawn for the next period with them), kept to the members
 * picked now.
 */
export function useTeamPeriodLogs({
	period,
	employeeIds,
	isEnabled
}: Readonly<{ period: Period; employeeIds: ReadonlyArray<string>; isEnabled: boolean }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);
	const requestRange = useMemo(() => requestRangeOf(period, new Date()), [period]);
	const { startDate, endDate } = requestDaysOf(requestRange);
	const sortedIds = useMemo(
		() => [...employeeIds].sort((first, second) => first.localeCompare(second)),
		[employeeIds]
	);
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasMembers = sortedIds.length > 0;
	const isReady = hasScope && hasMembers;
	const firstKey = localDayKeyOf(requestRange.from);
	const lastKey = localDayKeyOf(requestRange.to);
	const isLive = isLiveDayRange(firstKey, lastKey);
	const logsKey = queryKeys.timesheet.logs(tenantId, organizationId, startDate, endDate, sortedIds);
	const scopeKey = `${tenantId}:${organizationId}:${timeZone}`;

	const canFetch = isReady && isEnabled;
	const query = useQuery({
		queryKey: [...logsKey, 'team-dashboard', { timeZone }],
		queryFn: () => fetchTeamLogs(startDate, endDate, timeZone, sortedIds, period, scopeKey),
		enabled: canFetch,
		placeholderData: (previous: TeamPeriodLogs | undefined) => previousOfSameScope(previous, scopeKey),
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});

	const shown = query.data;
	const shownLogs = shown?.logs ?? NO_LOGS;
	// A member the filter no longer picks leaves at once, without waiting for the next read
	const logs = useMemo(() => {
		if (!query.isPlaceholderData) {
			return shownLogs;
		}
		return shownLogs.filter((log) => sortedIds.some((employeeId) => isLogOfEmployee(log, employeeId)));
	}, [query.isPlaceholderData, shownLogs, sortedIds]);

	return {
		logs,
		/**
		 * The period the logs on screen cover: the previous answer's own period while it stands in for the next read,
		 * the requested one otherwise. Two periods can share one read (the range always runs through today), so a
		 * cached answer's own period may be another one that the same logs cover.
		 */
		period: query.isPlaceholderData && shown ? shown.period : period,
		isLoading: query.isPending && canFetch,
		isError: query.isError,
		refetch: query.refetch
	};
}
