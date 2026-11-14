import {
	changesByEntryOf,
	type DeletedEntry,
	historyChangesOf,
	type TimeLogHistoryChange
} from '@/core/lib/utils/time-log-history';
import type { ITimeLogHistoryRow } from '@/core/types/interfaces/timer/time-log/time-log-history';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	changedEntriesOf,
	editsFiguresOf,
	EMPTY_EDITS_FILTERS,
	entryMatchesFilters,
	totalSecondsOfEntries
} from './manual-time-edits';
import { deletedEntriesOf, withHistoryOf } from './manual-time-edits-history';

const PAUL = 'paul';

const MEMBERS = new Map([[PAUL, { employeeId: PAUL, name: 'Paul', imageUrl: null }]]);

function row(overrides: Partial<ITimeLogHistoryRow>): ITimeLogHistoryRow {
	return {
		id: 'row',
		entityId: 'entry-1',
		action: 'Updated',
		createdAt: '2026-11-10T15:00:00.000Z',
		updatedFields: ['stoppedAt', 'duration'],
		previousValues: [{ stoppedAt: '2026-11-10T11:00:00.000Z' }, { duration: 7200 }],
		updatedValues: [{ stoppedAt: '2026-11-10T14:00:00.000Z' }, { duration: 18000 }],
		previousEntities: [],
		updatedEntities: [],
		data: { employeeId: PAUL, reason: 'Forgot to stop' },
		employeeId: 'manager',
		createdByUserId: 'manager-user',
		...overrides
	};
}

function log(id: string, overrides: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id,
		employeeId: PAUL,
		startedAt: new Date('2026-11-10T09:00:00.000Z'),
		stoppedAt: new Date('2026-11-10T14:00:00.000Z'),
		editedAt: new Date('2026-11-10T15:00:00.000Z'),
		duration: 18000,
		version: '1',
		...overrides
	};
}

function entriesOf(logs: ITimeLog[]) {
	return changedEntriesOf({ addedLogs: [], editedLogs: logs, members: MEMBERS, unnamedLabel: 'Unnamed' });
}

function byEntryOf(rows: ITimeLogHistoryRow[]) {
	return changesByEntryOf(historyChangesOf(rows));
}

const DELETION = row({
	id: 'gone',
	entityId: 'entry-gone',
	action: 'Deleted',
	updatedFields: ['startedAt', 'stoppedAt', 'employeeId', 'projectId', 'taskId', 'isBillable'],
	previousValues: [
		{ startedAt: '2026-11-11T09:00:00.000Z' },
		{ stoppedAt: '2026-11-11T10:30:00.000Z' },
		{ employeeId: PAUL },
		{ projectId: 'p1' },
		{ taskId: 't1' },
		{ isBillable: true }
	],
	updatedValues: [],
	previousEntities: [{ projectId: { id: 'p1', name: 'Website' } }, { taskId: { id: 't1', name: 'Fix login' } }],
	data: { employeeId: PAUL, reason: 'Logged twice' },
	createdAt: '2026-11-12T08:00:00.000Z'
});

function deletedOf(change: TimeLogHistoryChange): DeletedEntry {
	return {
		entryId: change.entryId,
		deletedAt: change.at,
		startedAt: new Date('2026-11-11T09:00:00.000Z'),
		stoppedAt: new Date('2026-11-11T10:30:00.000Z'),
		employeeId: PAUL,
		projectId: 'p1',
		projectName: 'Website',
		taskId: 't1',
		taskTitle: 'Fix login',
		isBillable: true,
		description: null,
		reason: 'Logged twice'
	};
}

describe('withHistoryOf', () => {
	it('gives an edited entry its last change and the kinds of its changes', () => {
		const added = row({
			id: 'added',
			action: 'Created',
			createdAt: '2026-11-10T08:00:00.000Z',
			previousValues: []
		});
		const edit = row({ id: 'edit' });
		const [entry] = withHistoryOf(entriesOf([log('entry-1')]), byEntryOf([added, edit]));
		expect(entry.lastChange?.id).toBe('edit');
		expect(entry.changeKinds).toEqual(['time']);
	});

	it('leaves an entry edited before the history was kept without a last change', () => {
		const [entry] = withHistoryOf(entriesOf([log('entry-old')]), byEntryOf([row({})]));
		expect(entry.lastChange).toBeNull();
		expect(entry.changeKinds).toEqual([]);
	});
});

describe('deletedEntriesOf', () => {
	it('lists a deleted entry with what it was, marked deleted', () => {
		const byEntry = byEntryOf([DELETION]);
		const [deletion] = byEntry.get('entry-gone') ?? [];
		const [entry] = deletedEntriesOf({
			deleted: [deletedOf(deletion)],
			byEntry,
			members: MEMBERS,
			unnamedLabel: 'Unnamed'
		});
		expect(entry).toMatchObject({
			key: 'entry-gone',
			isDeleted: true,
			isAdded: false,
			isEdited: false,
			memberName: 'Paul',
			projectName: 'Website',
			taskTitle: 'Fix login',
			seconds: 5400,
			isBillable: true,
			reason: 'Logged twice',
			changeKinds: ['deleted'],
			editedAt: new Date('2026-11-12T08:00:00.000Z')
		});
		expect(entry.lastChange?.id).toBe('gone');
		expect(entry.dayKey).toBe('2026-11-11');
	});
});

describe('the kinds of change filter', () => {
	it('keeps the entries with a change of a picked kind, and every entry when none is picked', () => {
		const byEntry = byEntryOf([row({}), DELETION]);
		const [edited] = withHistoryOf(entriesOf([log('entry-1')]), byEntry);
		const [deletion] = byEntry.get('entry-gone') ?? [];
		const [deleted] = deletedEntriesOf({
			deleted: [deletedOf(deletion)],
			byEntry,
			members: MEMBERS,
			unnamedLabel: ''
		});
		const onlyDeleted = { ...EMPTY_EDITS_FILTERS, kinds: ['deleted'] };
		expect(entryMatchesFilters(edited, EMPTY_EDITS_FILTERS)).toBe(true);
		expect(entryMatchesFilters(edited, onlyDeleted)).toBe(false);
		expect(entryMatchesFilters(deleted, onlyDeleted)).toBe(true);
	});
});

describe('deleted entries in the figures', () => {
	it('are counted apart and add no time', () => {
		const byEntry = byEntryOf([row({}), DELETION]);
		const edited = withHistoryOf(entriesOf([log('entry-1')]), byEntry);
		const [deletion] = byEntry.get('entry-gone') ?? [];
		const deleted = deletedEntriesOf({
			deleted: [deletedOf(deletion)],
			byEntry,
			members: MEMBERS,
			unnamedLabel: ''
		});
		const entries = [...edited, ...deleted];
		const figures = editsFiguresOf(entries);
		expect(figures.entryCount).toBe(1);
		expect(figures.deletedCount).toBe(1);
		expect(figures.manualSeconds).toBe(18000);
		expect(totalSecondsOfEntries(entries)).toBe(18000);
	});
});
