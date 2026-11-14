import {
	changeKindsOf,
	changesByEntryOf,
	changeSideTextOf,
	deletedEntryOf,
	entryChangeKindsOf,
	headlineFieldOf,
	historyChangesOf,
	type HistoryValueFormat,
	historyValueTextOf,
	isHistoryUnsupportedStatus
} from './time-log-history';
import type { ITimeLogHistoryRow } from '@/core/types/interfaces/timer/time-log/time-log-history';

const ENTRY = 'entry-1';

function editRow(overrides: Partial<ITimeLogHistoryRow> = {}): ITimeLogHistoryRow {
	return {
		id: 'row-2',
		entityId: ENTRY,
		action: 'Updated',
		createdAt: '2026-11-10T15:00:00.000Z',
		updatedFields: ['stoppedAt', 'duration'],
		previousValues: [{ stoppedAt: '2026-11-10T11:00:00.000Z' }, { duration: 7200 }],
		updatedValues: [{ stoppedAt: '2026-11-10T14:00:00.000Z' }, { duration: 18000 }],
		previousEntities: [],
		updatedEntities: [],
		data: { employeeId: 'paul', reason: 'Forgot to stop' },
		employeeId: 'manager',
		createdByUserId: 'manager-user',
		...overrides
	};
}

const FORMAT: HistoryValueFormat = {
	time: (date) => `${date.getUTCHours()}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
	duration: (seconds) => `${seconds / 3600} h`,
	yes: 'Yes',
	no: 'No',
	none: 'None',
	statusLabel: (status) => `status:${status}`,
	memberName: (employeeId) => (employeeId === 'paul' ? 'Paul' : null)
};

describe('historyChangesOf', () => {
	it('reads each change with its fields before and after, newest first', () => {
		const older = editRow({ id: 'row-1', createdAt: '2026-11-10T12:00:00.000Z' });
		const changes = historyChangesOf([older, editRow()]);
		expect(changes.map((change) => change.id)).toEqual(['row-2', 'row-1']);
		const [latest] = changes;
		expect(latest.action).toBe('updated');
		expect(latest.reason).toBe('Forgot to stop');
		expect(latest.ownerEmployeeId).toBe('paul');
		expect(latest.authorEmployeeId).toBe('manager');
		expect(latest.fields).toEqual([
			{
				field: 'stoppedAt',
				before: '2026-11-10T11:00:00.000Z',
				after: '2026-11-10T14:00:00.000Z',
				beforeName: null,
				afterName: null
			},
			{ field: 'duration', before: 7200, after: 18000, beforeName: null, afterName: null }
		]);
	});

	it('reads the JSON fields SQLite answers as text', () => {
		const row = editRow({
			updatedFields: JSON.stringify(['taskId']),
			previousValues: JSON.stringify([{ taskId: 't1' }]),
			updatedValues: JSON.stringify([{ taskId: 't2' }]),
			previousEntities: JSON.stringify([{ taskId: { id: 't1', name: 'Fix login' } }]),
			updatedEntities: JSON.stringify([{ taskId: { id: 't2', name: 'Fix signup' } }]),
			data: JSON.stringify({ employeeId: 'paul', reason: null })
		});
		const [change] = historyChangesOf([row]);
		expect(change.fields).toEqual([
			{ field: 'taskId', before: 't1', after: 't2', beforeName: 'Fix login', afterName: 'Fix signup' }
		]);
		expect(change.reason).toBeNull();
	});

	it('keeps the fields in reading order and leaves out unknown ones and rows without a date', () => {
		const row = editRow({
			updatedFields: ['isBillable', 'stoppedAt', 'version'],
			previousValues: [{ isBillable: true }, { stoppedAt: '2026-11-10T11:00:00.000Z' }, { version: 1 }],
			updatedValues: [{ isBillable: false }, { stoppedAt: '2026-11-10T12:00:00.000Z' }, { version: 2 }]
		});
		const broken = editRow({ id: 'broken', createdAt: 'not a date' });
		const changes = historyChangesOf([row, broken]);
		expect(changes).toHaveLength(1);
		expect(changes[0].fields.map((field) => field.field)).toEqual(['stoppedAt', 'isBillable']);
	});

	it('reads an entry added by hand and a deleted one', () => {
		const created = editRow({
			id: 'created',
			action: 'Created',
			createdAt: '2026-11-10T09:00:00.000Z',
			updatedFields: ['startedAt', 'stoppedAt'],
			previousValues: [],
			updatedValues: [{ startedAt: '2026-11-10T09:00:00.000Z' }, { stoppedAt: '2026-11-10T11:00:00.000Z' }]
		});
		const deleted = editRow({
			id: 'deleted',
			action: 'Deleted',
			updatedFields: ['startedAt', 'stoppedAt'],
			previousValues: [{ startedAt: '2026-11-10T09:00:00.000Z' }, { stoppedAt: '2026-11-10T11:00:00.000Z' }],
			updatedValues: []
		});
		const [deletion, creation] = historyChangesOf([created, deleted]);
		expect(creation.action).toBe('created');
		expect(creation.fields[0]).toMatchObject({ field: 'startedAt', before: null });
		expect(deletion.action).toBe('deleted');
		expect(deletion.fields[1]).toMatchObject({ field: 'stoppedAt', after: null });
	});
});

describe('change kinds', () => {
	it('names what a change touched, for the report filter', () => {
		const [timeChange] = historyChangesOf([editRow()]);
		expect(changeKindsOf(timeChange)).toEqual(['time']);
		const [taskChange] = historyChangesOf([
			editRow({
				updatedFields: ['projectId', 'isBillable'],
				previousValues: [{ projectId: 'a' }, { isBillable: true }],
				updatedValues: [{ projectId: 'b' }, { isBillable: false }]
			})
		]);
		expect(changeKindsOf(taskChange)).toEqual(['task-project', 'billable']);
		const [deletion] = historyChangesOf([editRow({ action: 'Deleted' })]);
		expect(changeKindsOf(deletion)).toEqual(['deleted']);
	});

	it('gives no kind to the row of an entry added by hand: adding is not changing', () => {
		const [creation] = historyChangesOf([editRow({ action: 'Created', previousValues: [] })]);
		expect(changeKindsOf(creation)).toEqual([]);
	});

	it('gives an entry every kind of its changes once', () => {
		const changes = historyChangesOf([
			editRow(),
			editRow({
				id: 'row-3',
				updatedFields: ['stoppedAt'],
				previousValues: [{ stoppedAt: 'a' }],
				updatedValues: [{ stoppedAt: 'b' }]
			}),
			editRow({
				id: 'row-4',
				updatedFields: ['taskId'],
				previousValues: [{ taskId: 'x' }],
				updatedValues: [{ taskId: 'y' }]
			})
		]);
		expect(entryChangeKindsOf(changes)).toEqual(['time', 'task-project']);
	});
});

describe('changesByEntryOf', () => {
	it('groups the changes of a period by entry, newest first', () => {
		const other = editRow({ id: 'other', entityId: 'entry-2' });
		const older = editRow({ id: 'older', createdAt: '2026-11-09T10:00:00.000Z' });
		const byEntry = changesByEntryOf(historyChangesOf([older, other, editRow()]));
		expect(byEntry.get(ENTRY)?.map((change) => change.id)).toEqual(['row-2', 'older']);
		expect(byEntry.get('entry-2')?.map((change) => change.id)).toEqual(['other']);
	});
});

describe('headlineFieldOf', () => {
	it('prefers the duration, so the line reads "2 h -> 5 h"', () => {
		const [change] = historyChangesOf([editRow()]);
		expect(headlineFieldOf(change)?.field).toBe('duration');
	});

	it('falls back to the first field when the duration did not change', () => {
		const [change] = historyChangesOf([
			editRow({ updatedFields: ['taskId'], previousValues: [{ taskId: 'a' }], updatedValues: [{ taskId: 'b' }] })
		]);
		expect(headlineFieldOf(change)?.field).toBe('taskId');
	});
});

describe('historyValueTextOf', () => {
	it('writes each kind of value the way the page reads it', () => {
		expect(historyValueTextOf('stoppedAt', '2026-11-10T14:00:00.000Z', null, FORMAT)).toBe('14:00');
		expect(historyValueTextOf('duration', 18000, null, FORMAT)).toBe('5 h');
		expect(historyValueTextOf('isBillable', true, null, FORMAT)).toBe('Yes');
		expect(historyValueTextOf('isBillable', false, null, FORMAT)).toBe('No');
		expect(historyValueTextOf('taskId', 't2', 'Fix signup', FORMAT)).toBe('Fix signup');
		expect(historyValueTextOf('employeeId', 'paul', null, FORMAT)).toBe('Paul');
		expect(historyValueTextOf('status', 'APPROVED', null, FORMAT)).toBe('status:APPROVED');
		expect(historyValueTextOf('description', 'Call with the client', null, FORMAT)).toBe('Call with the client');
		expect(historyValueTextOf('taskId', null, null, FORMAT)).toBe('None');
	});
});

describe('changeSideTextOf', () => {
	const labelOf = (field: string) => field.toUpperCase();

	it('writes each field of one side with its label, for a file', () => {
		const [change] = historyChangesOf([editRow()]);
		expect(changeSideTextOf(change, 'before', FORMAT, labelOf)).toBe('STOPPEDAT 11:00; DURATION 2 h');
		expect(changeSideTextOf(change, 'after', FORMAT, labelOf)).toBe('STOPPEDAT 14:00; DURATION 5 h');
	});
});

describe('deletedEntryOf', () => {
	it('gives back what a deleted entry was', () => {
		const [deletion] = historyChangesOf([
			editRow({
				id: 'gone',
				action: 'Deleted',
				updatedFields: [
					'startedAt',
					'stoppedAt',
					'employeeId',
					'projectId',
					'taskId',
					'isBillable',
					'description'
				],
				previousValues: [
					{ startedAt: '2026-11-10T09:00:00.000Z' },
					{ stoppedAt: '2026-11-10T11:00:00.000Z' },
					{ employeeId: 'paul' },
					{ projectId: 'p1' },
					{ taskId: 't1' },
					{ isBillable: true },
					{ description: 'Workshop' }
				],
				updatedValues: [],
				previousEntities: [
					{ projectId: { id: 'p1', name: 'Website' } },
					{ taskId: { id: 't1', name: 'Fix login' } }
				]
			})
		]);
		expect(deletedEntryOf(deletion)).toEqual({
			entryId: ENTRY,
			deletedAt: new Date('2026-11-10T15:00:00.000Z'),
			startedAt: new Date('2026-11-10T09:00:00.000Z'),
			stoppedAt: new Date('2026-11-10T11:00:00.000Z'),
			employeeId: 'paul',
			projectId: 'p1',
			projectName: 'Website',
			taskId: 't1',
			taskTitle: 'Fix login',
			isBillable: true,
			description: 'Workshop',
			reason: 'Forgot to stop'
		});
	});

	it('has nothing for a change that is not a deletion', () => {
		const [change] = historyChangesOf([editRow()]);
		expect(deletedEntryOf(change)).toBeNull();
	});
});

describe('isHistoryUnsupportedStatus', () => {
	it('reads an API without the history routes from its answer', () => {
		expect(isHistoryUnsupportedStatus(404)).toBe(true);
		expect(isHistoryUnsupportedStatus(400)).toBe(true);
		expect(isHistoryUnsupportedStatus(405)).toBe(true);
		expect(isHistoryUnsupportedStatus(403)).toBe(false);
		expect(isHistoryUnsupportedStatus(500)).toBe(false);
		expect(isHistoryUnsupportedStatus(undefined)).toBe(false);
	});
});
