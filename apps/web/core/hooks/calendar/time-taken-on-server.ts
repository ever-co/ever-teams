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

/** What the server holds on a part a write may have saved before its answer was lost. */
export type PartOnServer = 'saved' | 'free' | 'taken';

const SAME_MOMENT_MILLISECONDS = 1000;

function isSameMoment(value: string | null | undefined, moment: Date) {
	if (!value) {
		return false;
	}
	const time = new Date(value).getTime();
	return Math.abs(time - moment.getTime()) < SAME_MOMENT_MILLISECONDS;
}

function overlapsPart(conflict: { startedAt?: string | null; stoppedAt?: string | null }, part: TimeWindow) {
	if (!conflict.startedAt || !conflict.stoppedAt) {
		return true;
	}
	const start = new Date(conflict.startedAt).getTime();
	const end = new Date(conflict.stoppedAt).getTime();
	return start < part.end.getTime() && end > part.start.getTime();
}

/**
 * Reads the server on a part: 'saved' when an entry there has the part's very start, end and task, 'free' when no
 * entry covers it, 'taken' when another entry does (another writer, or a part saved otherwise than asked).
 */
export async function partOnServer(log: ITimeLog, part: TimeWindow, taskId: string | null): Promise<PartOnServer> {
	const employeeId = memberIdOfLog(log);
	if (!employeeId) {
		return 'taken';
	}
	const conflicts = await timeLogService.getTimeLogConflicts({
		employeeId,
		startDate: part.start,
		endDate: part.end,
		ignoreId: log.id
	});
	const covering = conflicts.filter((conflict) => conflict.id !== log.id && overlapsPart(conflict, part));
	if (covering.length === 0) {
		return 'free';
	}
	const isThePart = covering.some(
		(conflict) =>
			isSameMoment(conflict.startedAt, part.start) &&
			isSameMoment(conflict.stoppedAt, part.end) &&
			(conflict.taskId ?? null) === taskId
	);
	if (isThePart) {
		return 'saved';
	}
	return 'taken';
}
