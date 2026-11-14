import { describe, expect, it } from '@jest/globals';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { listItemsOf, type TimesheetListItem } from './timesheet-entry-groups';

const DAY_KEY = '2026-11-10';

function logOf(id: string, startHour: number, endHour: number | null, overrides: Partial<ITimeLog> = {}): ITimeLog {
	const startedAt = new Date(Date.UTC(2026, 10, 10, startHour));
	let stoppedAt: Date | undefined;
	if (endHour !== null) {
		stoppedAt = new Date(Date.UTC(2026, 10, 10, endHour));
	}
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'marie',
		taskId: 'fix-login',
		projectId: 'site',
		isBillable: true,
		description: '',
		startedAt,
		stoppedAt,
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet'],
		...overrides
	};
}

function idsOf(item: TimesheetListItem): string[] {
	if (item.kind === 'group') {
		return item.group.logs.map((log) => log.id);
	}
	return [item.log.id];
}

describe('listItemsOf', () => {
	it("puts a day's entries on the same task, project, notes and billable state in one group", () => {
		const logs = [1, 2, 3, 4, 5, 6].map((hour) => logOf(`log-${hour}`, hour, hour + 1));

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items).toHaveLength(1);
		const [item] = items;
		expect(item.kind).toBe('group');
		expect(idsOf(item)).toEqual(['log-1', 'log-2', 'log-3', 'log-4', 'log-5', 'log-6']);
	});

	it('gives a group its first start, its last end and the total of its entries', () => {
		const logs = [logOf('a', 9, 10), logOf('b', 13, 15), logOf('c', 11, 12)];

		const [item] = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(item.kind).toBe('group');
		if (item.kind !== 'group') {
			return;
		}
		expect(item.group.firstStart?.toISOString()).toBe('2026-11-10T09:00:00.000Z');
		expect(item.group.lastEnd?.toISOString()).toBe('2026-11-10T15:00:00.000Z');
		expect(item.group.totalSeconds).toBe(4 * 3600);
		expect(item.group.isRunning).toBe(false);
	});

	it('keeps an entry that differs in its billable state on its own row', () => {
		const logs = [logOf('a', 9, 10), logOf('b', 10, 11), logOf('c', 11, 12, { isBillable: false })];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items.map(idsOf)).toEqual([['a', 'b'], ['c']]);
		expect(items[1].kind).toBe('entry');
	});

	it.each<[string, Partial<ITimeLog>]>([
		['task', { taskId: 'fix-signup' }],
		['project', { projectId: 'mobile' }],
		['notes', { description: 'Pairing with Paul' }],
		['member', { employeeId: 'paul' }],
		['status', { timesheet: { id: 'other', status: ETimesheetStatus.APPROVED } as ITimeLog['timesheet'] }]
	])('keeps an entry with another %s apart', (_difference, overrides) => {
		const logs = [logOf('a', 9, 10), logOf('b', 10, 11), logOf('c', 11, 12, overrides)];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items.map(idsOf)).toEqual([['a', 'b'], ['c']]);
	});

	it('reads notes without their surrounding spaces, and empty notes as none', () => {
		const logs = [
			logOf('a', 9, 10, { description: ' Standup ' }),
			logOf('b', 10, 11, { description: 'Standup' }),
			logOf('c', 11, 12, { description: '   ' }),
			logOf('d', 12, 13, { description: undefined })
		];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items.map(idsOf)).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('leaves an entry with no similar entry as an entry, never a group of one', () => {
		const logs = [logOf('a', 9, 10), logOf('b', 10, 11, { taskId: 'meetings' })];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items.map((item) => item.kind)).toEqual(['entry', 'entry']);
	});

	it('shows a group where its first entry stands and keeps the order of the list inside it', () => {
		const meeting = logOf('meeting', 10, 11, { taskId: 'meetings' });
		const logs = [logOf('late', 15, 16), meeting, logOf('early', 9, 10)];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(items.map(idsOf)).toEqual([['late', 'early'], ['meeting']]);
	});

	it('says a group with a running entry is running, with no last end', () => {
		const running = logOf('now', 14, null, { isRunning: true, duration: 1800 });
		const logs = [logOf('a', 9, 10), running];

		const [item] = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: true });

		expect(item.kind).toBe('group');
		if (item.kind !== 'group') {
			return;
		}
		expect(item.group.isRunning).toBe(true);
		expect(item.group.lastEnd).toBeNull();
		expect(item.group.totalSeconds).toBe(3600 + 1800);
	});

	it('names each group after its day, so two days never share a group key', () => {
		const logs = [logOf('a', 9, 10), logOf('b', 10, 11)];

		const [monday] = listItemsOf(logs, { dayKey: '2026-11-09', isGrouping: true });
		const [tuesday] = listItemsOf(logs, { dayKey: '2026-11-10', isGrouping: true });

		expect(monday.kind).toBe('group');
		expect(tuesday.kind).toBe('group');
		if (monday.kind !== 'group' || tuesday.kind !== 'group') {
			return;
		}
		expect(monday.group.key).not.toBe(tuesday.group.key);
	});

	it('lists every entry on its own row when grouping is off', () => {
		const logs = [logOf('a', 9, 10), logOf('b', 10, 11), logOf('c', 11, 12)];

		const items = listItemsOf(logs, { dayKey: DAY_KEY, isGrouping: false });

		expect(items.map((item) => item.kind)).toEqual(['entry', 'entry', 'entry']);
		expect(items.map(idsOf)).toEqual([['a'], ['b'], ['c']]);
	});
});
