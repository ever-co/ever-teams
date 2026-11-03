'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;

export interface TimesheetPageLogsScope {
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
	/** The user's zone as Gauzy stores it ("Europe/Paris (UTC+01:00)"): only the name before the bracket is sent. */
	userTimeZone: string | null | undefined;
	/** Sent as `employeeIds`; empty lets Gauzy return every member the caller may see. */
	employeeIds: ReadonlyArray<string>;
	isEnabled: boolean;
}

function timeZoneNameOf(userTimeZone: string | null | undefined) {
	const name = userTimeZone?.split('(')[0]?.trim();
	if (name) {
		return name;
	}
	return 'UTC';
}

/**
 * The time logs of a period, read with the same request the old timesheet sent (`GET /timesheet/time-log` with its
 * relations), under a key that holds every value of the request. The key lives under `['timesheet']`, so the
 * timesheet mutations refresh it. The previous period stays on screen while the next one loads.
 */
export function useTimesheetPageLogs(period: Period, scope: TimesheetPageLogsScope) {
	const startDate = localDayKeyOf(period.from);
	const endDate = localDayKeyOf(period.to);
	const timeZone = timeZoneNameOf(scope.userTimeZone);
	const employeeIds = [...scope.employeeIds].sort();
	const hasTenant = Boolean(scope.tenantId);
	const hasOrganization = Boolean(scope.organizationId);
	const isReady = hasTenant && hasOrganization;
	const isLive = isLiveDayRange(startDate, endDate);

	return useQuery({
		queryKey: [
			...queryKeys.timesheet.all,
			'page-logs',
			{
				tenantId: scope.tenantId ?? null,
				organizationId: scope.organizationId ?? null,
				startDate,
				endDate,
				timeZone,
				employeeIds
			}
		],
		queryFn: async (): Promise<ITimeLog[]> => {
			const logs = await timeLogService.getTimeLogs({ startDate, endDate, timeZone, employeeIds });
			return logs ?? [];
		},
		enabled: isReady && scope.isEnabled,
		placeholderData: keepPreviousData,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});
}
