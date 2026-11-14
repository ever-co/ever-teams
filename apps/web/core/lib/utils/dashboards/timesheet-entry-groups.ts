import { entryNotesOf } from '@/core/lib/utils/timer/timer-notes';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	endOfLog,
	logDurationSeconds,
	startOfLog,
	statusOfLog,
	type TimesheetSort,
	type TimesheetSortKey
} from './timesheets';

/**
 * Entries of one day that record the same work: same member, task, project, notes and billable state. They also
 * share their review status, so the status a group row shows is the status of every entry in it.
 */
export interface TimesheetEntryGroup {
	/** The day's key and the shared values, so a group keeps its key while the list refreshes. */
	key: string;
	/** In the order of the list. */
	logs: ITimeLog[];
	firstStart: Date | null;
	/** Null while one of its entries runs. */
	lastEnd: Date | null;
	isRunning: boolean;
	totalSeconds: number;
}

export type TimesheetListItem = { kind: 'entry'; log: ITimeLog } | { kind: 'group'; group: TimesheetEntryGroup };

const KEY_SEPARATOR = '|';

function similarWorkKeyOf(log: ITimeLog): string {
	const memberId = log.employeeId ?? log.employee?.id ?? '';
	const taskId = log.taskId ?? log.task?.id ?? '';
	const projectId = log.projectId ?? log.project?.id ?? '';
	const notes = entryNotesOf(log) ?? '';
	const billable = String(Boolean(log.isBillable));
	const status = statusOfLog(log) ?? '';
	return [memberId, taskId, projectId, billable, status, notes].join(KEY_SEPARATOR);
}

function isRunningLog(log: ITimeLog): boolean {
	if (log.isRunning === true) {
		return true;
	}
	return !endOfLog(log);
}

function earliestStartOf(logs: ReadonlyArray<ITimeLog>): Date | null {
	let earliest: Date | null = null;
	for (const log of logs) {
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const isEarlier = !earliest || start.getTime() < earliest.getTime();
		if (isEarlier) {
			earliest = start;
		}
	}
	return earliest;
}

function latestEndOf(logs: ReadonlyArray<ITimeLog>): Date | null {
	let latest: Date | null = null;
	for (const log of logs) {
		const end = endOfLog(log);
		if (!end) {
			continue;
		}
		const isLater = !latest || end.getTime() > latest.getTime();
		if (isLater) {
			latest = end;
		}
	}
	return latest;
}

function groupOf(key: string, logs: ITimeLog[]): TimesheetEntryGroup {
	const isRunning = logs.some(isRunningLog);
	let lastEnd: Date | null = null;
	if (!isRunning) {
		lastEnd = latestEndOf(logs);
	}
	let totalSeconds = 0;
	for (const log of logs) {
		totalSeconds += logDurationSeconds(log);
	}
	return { key, logs, firstStart: earliestStartOf(logs), lastEnd, isRunning, totalSeconds };
}

type GroupFigureKey = Extract<TimesheetSortKey, 'duration' | 'time'>;

function isGroupFigureKey(key: TimesheetSortKey): key is GroupFigureKey {
	return key === 'duration' || key === 'time';
}

/** What a row shows in the duration or time column: a group shows its total and its first start. */
function figureOf(item: TimesheetListItem, key: GroupFigureKey): number {
	if (key === 'duration') {
		if (item.kind === 'group') {
			return item.group.totalSeconds;
		}
		return logDurationSeconds(item.log);
	}
	const start = item.kind === 'group' ? item.group.firstStart : startOfLog(item.log);
	return start?.getTime() ?? 0;
}

/**
 * The logs come sorted by the picked column. Status, task, project and member hold one value for a whole group, so
 * the group already stands where that value puts it; duration and time show the group's own total and first
 * start, so the rows are sorted again by what they show. The entries of a group keep the order of the logs.
 */
function sortedByFigures(items: TimesheetListItem[], sort: TimesheetSort | null | undefined): TimesheetListItem[] {
	if (!sort || !isGroupFigureKey(sort.key)) {
		return items;
	}
	const key = sort.key;
	const factor = sort.direction === 'asc' ? 1 : -1;
	return [...items].sort((first, second) => (figureOf(first, key) - figureOf(second, key)) * factor);
}

/**
 * The rows of one day in the list: an entry recorded once stays an entry; entries that record the same work become
 * one group, shown where the first of them stands, its entries in the order of the list. Without grouping, one row
 * per entry, as the list always showed them. Sorted by duration or time, a group stands where its total or its
 * first start puts it.
 */
export function listItemsOf(
	logs: ReadonlyArray<ITimeLog>,
	options: Readonly<{ dayKey: string; isGrouping: boolean; sort?: TimesheetSort | null }>
): TimesheetListItem[] {
	if (!options.isGrouping) {
		return logs.map((log) => ({ kind: 'entry', log }));
	}
	const logsByKey = new Map<string, ITimeLog[]>();
	for (const log of logs) {
		const key = similarWorkKeyOf(log);
		const similar = logsByKey.get(key);
		if (similar) {
			similar.push(log);
			continue;
		}
		logsByKey.set(key, [log]);
	}
	const items: TimesheetListItem[] = [];
	const placedKeys = new Set<string>();
	for (const log of logs) {
		const key = similarWorkKeyOf(log);
		const similar = logsByKey.get(key) ?? [log];
		const isAlone = similar.length < 2;
		if (isAlone) {
			items.push({ kind: 'entry', log });
			continue;
		}
		if (placedKeys.has(key)) {
			continue;
		}
		placedKeys.add(key);
		const groupKey = `${options.dayKey}${KEY_SEPARATOR}${key}`;
		items.push({ kind: 'group', group: groupOf(groupKey, similar) });
	}
	return sortedByFigures(items, options.sort);
}
