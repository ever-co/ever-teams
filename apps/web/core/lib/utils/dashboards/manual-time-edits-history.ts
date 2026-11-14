import { startOfDay } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { NO_PROJECT_VALUE } from '@/core/lib/utils/dashboards/timesheets';
import { type DeletedEntry, entryChangeKindsOf, type TimeLogHistoryChange } from '@/core/lib/utils/time-log-history';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { EditsMember, ManualTimeEntry } from './manual-time-edits';

const MILLISECONDS_PER_SECOND = 1000;

/** The newest change that edited or deleted the entry: adding it by hand is told by its Added mark. */
function lastChangeOf(changes: ReadonlyArray<TimeLogHistoryChange>) {
	return changes.find((change) => change.action !== 'created') ?? null;
}

/** The report's entries with what their history says: the kinds of their changes and their last change. */
export function withHistoryOf(
	entries: ReadonlyArray<ManualTimeEntry>,
	byEntry: ReadonlyMap<string, TimeLogHistoryChange[]>
): ManualTimeEntry[] {
	return entries.map((entry) => {
		const changes = byEntry.get(entry.key);
		if (!changes) {
			return entry;
		}
		return { ...entry, changeKinds: entryChangeKindsOf(changes), lastChange: lastChangeOf(changes) };
	});
}

function secondsBetween(start: Date | null, end: Date | null) {
	if (!start || !end) {
		return 0;
	}
	const elapsed = end.getTime() - start.getTime();
	return Math.max(0, Math.round(elapsed / MILLISECONDS_PER_SECOND));
}

/** The log a deleted entry was, rebuilt from its deletion, for the parts of the page that read a log. */
function logOfDeleted(deleted: DeletedEntry, employeeId: string, seconds: number): ITimeLog {
	return {
		id: deleted.entryId,
		employeeId,
		projectId: deleted.projectId ?? undefined,
		taskId: deleted.taskId ?? undefined,
		startedAt: deleted.startedAt ?? undefined,
		stoppedAt: deleted.stoppedAt ?? undefined,
		description: deleted.description ?? undefined,
		isBillable: deleted.isBillable,
		duration: seconds,
		deletedAt: deleted.deletedAt,
		version: ''
	};
}

interface DeletedEntriesInput {
	deleted: ReadonlyArray<DeletedEntry>;
	byEntry: ReadonlyMap<string, TimeLogHistoryChange[]>;
	members: ReadonlyMap<string, EditsMember>;
	unnamedLabel: string;
}

/** The entries deleted in the period, listed with what they were: their member, task, project, time and reason. */
export function deletedEntriesOf({ deleted, byEntry, members, unnamedLabel }: DeletedEntriesInput): ManualTimeEntry[] {
	const entries: ManualTimeEntry[] = [];
	for (const item of deleted) {
		const start = item.startedAt;
		if (!start) {
			continue;
		}
		const employeeId = item.employeeId ?? '';
		const member = members.get(employeeId);
		const seconds = secondsBetween(start, item.stoppedAt);
		const day = startOfDay(start);
		const changes = byEntry.get(item.entryId) ?? [];
		entries.push({
			key: item.entryId,
			log: logOfDeleted(item, employeeId, seconds),
			day,
			dayKey: localDayKeyOf(day),
			employeeId,
			memberName: member?.name ?? unnamedLabel,
			memberImageUrl: member?.imageUrl ?? null,
			projectValue: item.projectId ?? NO_PROJECT_VALUE,
			projectName: item.projectName,
			projectColor: null,
			taskTitle: item.taskTitle,
			start,
			end: item.stoppedAt,
			seconds,
			isAdded: false,
			isEdited: false,
			editedAt: item.deletedAt,
			isBillable: item.isBillable,
			status: null,
			reason: item.reason,
			isDeleted: true,
			changeKinds: ['deleted'],
			lastChange: lastChangeOf(changes)
		});
	}
	return entries;
}
