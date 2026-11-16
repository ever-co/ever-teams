'use client';

import { useMemo, useState } from 'react';
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

/** The logs with the workspace they were read for. */
interface TeamPeriodLogs {
	logs: ITimeLog[];
	scopeKey: string;
}

async function fetchTeamLogs(
	startDate: string,
	endDate: string,
	timeZone: string,
	employeeIds: string[],
	scopeKey: string
): Promise<TeamPeriodLogs> {
	const logs = await timeLogService.getTimeLogs({ startDate, endDate, timeZone, employeeIds });
	return { logs: logs ?? NO_LOGS, scopeKey };
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
		queryFn: () => fetchTeamLogs(startDate, endDate, timeZone, sortedIds, scopeKey),
		enabled: canFetch,
		placeholderData: (previous: TeamPeriodLogs | undefined) => previousOfSameScope(previous, scopeKey),
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});

	const shownLogs = query.data?.logs ?? NO_LOGS;
	// The period the logs on screen were last drawn for. A placeholder keeps it rather than the period its read was
	// first made for: two periods can share one read (the range always runs through today), and the screen may already
	// have moved to the second one when the next period is picked.
	const [drawnPeriod, setDrawnPeriod] = useState<Period>(period);
	const isDrawnPeriodBehind = !query.isPlaceholderData && drawnPeriod !== period;
	if (isDrawnPeriodBehind) {
		setDrawnPeriod(period);
	}
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
		 * The period the logs on screen cover: the one they were last drawn for while they stand in for the next read,
		 * the requested one otherwise (a cached answer covers it, even when another period made the read).
		 */
		period: query.isPlaceholderData ? drawnPeriod : period,
		isLoading: query.isPending && canFetch,
		isError: query.isError,
		refetch: query.refetch
	};
}
