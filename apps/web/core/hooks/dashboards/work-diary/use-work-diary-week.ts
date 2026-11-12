'use client';

import { useMemo } from 'react';
import type { SheetEditingSource } from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import { useTimesheetPageLogs } from '@/core/hooks/dashboards/timesheets/use-timesheet-page-logs';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { logsOfMember } from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const NO_LOGS: ITimeLog[] = [];
const NO_EMPLOYEES: string[] = [];

export interface WorkDiaryWeekScope {
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
	/** The signed-in member's own employee id: the only one the week is read for. */
	employeeId: string | null;
	week: Period;
	/** The zone the Work diary counts its days in. */
	timeZone: string;
	isEnabled: boolean;
}

function ownEmployeeIdsOf(employeeId: string | null) {
	if (!employeeId) {
		return NO_EMPLOYEES;
	}
	return [employeeId];
}

/**
 * The signed-in member's own week for the Work diary's week sheet, on the request the Timesheets sheet sends
 * (`useTimesheetPageLogs`), for their employee id alone: the logs a manager reads for them there, in the cache entry
 * the sheet's own reads before a write land in. Nothing is asked while the member is unknown, because a request
 * without an employee returns everyone the caller may see, and only the member's own logs are kept from the answer.
 * The logs of another week never stand in for this one's while it loads.
 */
export function useWorkDiaryWeek(scope: WorkDiaryWeekScope) {
	const { tenantId, organizationId, employeeId, week, timeZone, isEnabled } = scope;
	const employeeIds = useMemo(() => ownEmployeeIdsOf(employeeId), [employeeId]);
	const hasEmployee = Boolean(employeeId);
	const query = useTimesheetPageLogs(week, {
		tenantId,
		organizationId,
		userTimeZone: timeZone,
		employeeIds,
		isEnabled: isEnabled && hasEmployee
	});
	const answer = query.data;
	const isAnotherWeek = query.isPlaceholderData;
	const hasLogs = answer !== undefined && !isAnotherWeek;
	const logs = useMemo(() => {
		if (!answer) {
			return NO_LOGS;
		}
		if (isAnotherWeek) {
			return NO_LOGS;
		}
		return logsOfMember(answer, employeeId);
	}, [answer, employeeId, isAnotherWeek]);

	const source = useMemo<SheetEditingSource>(
		() => ({
			ownEmployeeId: employeeId,
			// The Work diary writes the viewer's own time only, whatever their role allows in Timesheets
			hasOrganizationRole: false,
			period: week,
			periodLogs: logs,
			hasPeriodLogs: hasLogs,
			isFiltered: false,
			tenantId,
			organizationId,
			userTimeZone: timeZone
		}),
		[employeeId, hasLogs, logs, organizationId, tenantId, timeZone, week]
	);

	return {
		source,
		hasLogs,
		isError: query.isError && !hasLogs,
		isUpdating: query.isFetching && hasLogs,
		refetch: query.refetch
	};
}

export type WorkDiaryWeekState = ReturnType<typeof useWorkDiaryWeek>;
