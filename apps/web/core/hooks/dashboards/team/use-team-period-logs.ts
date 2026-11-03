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
import { requestRangeOf } from '@/core/lib/utils/dashboards/team-day';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;
const NO_LOGS: ITimeLog[] = [];

async function fetchTeamLogs(startDate: string, endDate: string, timeZone: string, employeeIds: string[]) {
	const logs = await timeLogService.getTimeLogs({ startDate, endDate, timeZone, employeeIds });
	return logs ?? NO_LOGS;
}

/**
 * The team's time logs with their start and end, over the period and today (the day timeline always shows today).
 * The daily report only has totals per day; the timeline and the hour heatmap need the hours. Read on the time-log
 * list and under its key family, so every add, edit and delete refreshes it. The list's bounds are midnight UTC of
 * the dates, so one more day is asked on each side and the helpers keep what starts inside.
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
	const sortedIds = useMemo(() => [...employeeIds].sort(), [employeeIds]);
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasMembers = sortedIds.length > 0;
	const isReady = hasScope && hasMembers;
	const firstKey = localDayKeyOf(requestRange.from);
	const lastKey = localDayKeyOf(requestRange.to);
	const isLive = isLiveDayRange(firstKey, lastKey);
	const logsKey = queryKeys.timesheet.logs(tenantId, organizationId, startDate, endDate, sortedIds);

	const canFetch = isReady && isEnabled;
	const query = useQuery({
		queryKey: [...logsKey, 'team-dashboard', { timeZone }],
		queryFn: () => fetchTeamLogs(startDate, endDate, timeZone, sortedIds),
		enabled: canFetch,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});

	return {
		logs: query.data ?? NO_LOGS,
		isLoading: query.isPending && canFetch,
		isError: query.isError,
		refetch: query.refetch
	};
}
