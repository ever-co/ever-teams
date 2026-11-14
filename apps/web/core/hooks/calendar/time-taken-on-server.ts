import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { memberIdOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { hasUnreadableInterval, overlapSummaryOf } from '@/core/lib/utils/time-log-overlap';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * Whether the API holds another entry of the member on a time. The grid only knows the entries of its last read:
 * one saved since, from another tab or by a manager, would be removed whole by the API without a word.
 */
export async function isTakenOnServer(log: ITimeLog, next: TimeWindow): Promise<boolean> {
	const employeeId = memberIdOfLog(log);
	if (!employeeId) {
		return false;
	}
	const conflicts = await timeLogService.getTimeLogConflicts({
		employeeId,
		startDate: next.start,
		endDate: next.end,
		ignoreId: log.id
	});
	const others = conflicts.filter((conflict) => conflict.id !== log.id);
	const hasUnreadableEntry = others.some(hasUnreadableInterval);
	if (hasUnreadableEntry) {
		return true;
	}
	const period = { start: next.start, end: next.end };
	const overlap = overlapSummaryOf({ periods: [period], logs: others, ignoredLogId: log.id, now: new Date() });
	return overlap.entries.length > 0;
}
