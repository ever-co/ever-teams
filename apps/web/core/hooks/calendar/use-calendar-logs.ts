'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { type CalendarView, requestDaysOf } from '@/core/lib/utils/calendar-view';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;

export interface CalendarLogsRequest {
	employeeId: string;
	view: CalendarView;
	anchor: Date;
	range: Period;
	startDate: string;
	endDate: string;
	timeZone: string;
	/** Tenant, organisation and member: the previous days stay on screen only while these do not change. */
	scopeKey: string;
}

export interface CalendarLogsResult {
	request: CalendarLogsRequest;
	logs: ITimeLog[];
}

export interface CalendarLogsScope {
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
	employeeId: string | null;
	view: CalendarView;
	anchor: Date;
	range: Period;
	timeZone: string;
	isEnabled: boolean;
}

function scopeKeyOf(scope: CalendarLogsScope) {
	const tenantPart = scope.tenantId ?? '';
	const organizationPart = scope.organizationId ?? '';
	const employeePart = scope.employeeId ?? '';
	return `${tenantPart}:${organizationPart}:${employeePart}`;
}

function previousOfSameScope(previous: CalendarLogsResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

async function fetchCalendarLogs(request: CalendarLogsRequest): Promise<CalendarLogsResult> {
	const logs = await timeLogService.getTimeLogs({
		startDate: request.startDate,
		endDate: request.endDate,
		timeZone: request.timeZone,
		employeeIds: [request.employeeId]
	});
	return { request, logs: logs ?? [] };
}

/**
 * One member's time logs over the shown days, on the time-log list the Timesheets page reads and under its key
 * family, so every add, edit and delete of a log refreshes it. The previous days stay on screen while the next ones
 * load, for the same member only.
 */
export function useCalendarLogs(scope: CalendarLogsScope) {
	const { startDate, endDate } = requestDaysOf(scope.range);
	const employeeId = scope.employeeId ?? '';
	const scopeKey = scopeKeyOf(scope);
	const request: CalendarLogsRequest = {
		employeeId,
		view: scope.view,
		anchor: scope.anchor,
		range: scope.range,
		startDate,
		endDate,
		timeZone: scope.timeZone,
		scopeKey
	};
	const hasTenant = Boolean(scope.tenantId);
	const hasOrganization = Boolean(scope.organizationId);
	const hasEmployee = Boolean(scope.employeeId);
	const isReady = hasTenant && hasOrganization && hasEmployee;
	const firstShownKey = localDayKeyOf(scope.range.from);
	const lastShownKey = localDayKeyOf(scope.range.to);
	const isLive = isLiveDayRange(firstShownKey, lastShownKey);
	const logsKey = queryKeys.timesheet.logs(scope.tenantId, scope.organizationId, startDate, endDate, [employeeId]);

	return useQuery({
		queryKey: [...logsKey, 'calendar', { timeZone: scope.timeZone }],
		queryFn: () => fetchCalendarLogs(request),
		enabled: isReady && scope.isEnabled,
		placeholderData: (previous) => previousOfSameScope(previous, scopeKey),
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});
}
