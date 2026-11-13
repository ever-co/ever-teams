import { addDays } from 'date-fns';

import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

export interface MemberTimeLogsScope {
	tenantId: string | null;
	organizationId: string | null;
	/** Always one employee: without it Gauzy answers a caller who may see others with every member's entries. */
	employeeId: string;
	/** First and last day read, as `YYYY-MM-DD`, cut in `timeZone`. */
	startDate: string;
	endDate: string;
	timeZone: string;
}

/**
 * The time entries of one member over some days, read with the request the Timesheets page sends. The key lives
 * under `['timesheet']`, so a stopped timer and every time log mutation refresh it, and it holds every value of
 * the request.
 */
export function memberTimeLogsQueryOf(scope: MemberTimeLogsScope) {
	const { employeeId, startDate, endDate, timeZone } = scope;
	return {
		queryKey: [...queryKeys.timesheet.all, 'member-logs', scope] as const,
		queryFn: async (): Promise<ITimeLog[]> => {
			const logs = await timeLogService.getTimeLogs({ startDate, endDate, timeZone, employeeIds: [employeeId] });
			return logs ?? [];
		}
	};
}

export interface MemberLogsWorkspace {
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
}

/** The last `dayCount` days of the browser's calendar, `lastDay` included. */
export function lastDaysScopeOf(
	workspace: MemberLogsWorkspace,
	employeeId: string,
	lastDay: Date,
	dayCount: number
): MemberTimeLogsScope {
	const firstDay = addDays(lastDay, 1 - dayCount);
	return {
		tenantId: workspace.tenantId ?? null,
		organizationId: workspace.organizationId ?? null,
		employeeId,
		startDate: localDayKeyOf(firstDay),
		endDate: localDayKeyOf(lastDay),
		timeZone: getDefaultTimezone()
	};
}

/** A day and the one before it: an entry started the evening before can still run into the day. */
export function dayAndEveScopeOf(workspace: MemberLogsWorkspace, employeeId: string, day: Date): MemberTimeLogsScope {
	return lastDaysScopeOf(workspace, employeeId, day, 2);
}
