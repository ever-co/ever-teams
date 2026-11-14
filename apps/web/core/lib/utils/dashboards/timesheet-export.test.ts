import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { timesheetExportDaysOf, timesheetExportRowsOf, timesheetExportTotalsOf } from './timesheet-export';

function logOf(id: string, start: Date, minutes: number, fields: Record<string, unknown> = {}): ITimeLog {
	const end = new Date(start.getTime() + minutes * 60_000);
	return { id, startedAt: start, stoppedAt: end, duration: minutes * 60, ...fields } as unknown as ITimeLog;
}

function secondsOf(items: ReadonlyArray<{ seconds: number }>) {
	let total = 0;
	for (const item of items) {
		total += item.seconds;
	}
	return total;
}

const ada = { id: 'ada', fullName: 'Ada Lovelace' };
const grace = { id: 'grace', fullName: 'Grace Hopper' };

// Local times, so the days and the clock times read the same whatever the zone the tests run in
const monday = logOf('monday', new Date(2026, 10, 2, 9, 5), 90, {
	employee: ada,
	project: { id: 'website', name: 'Website' },
	task: { id: 't1', title: 'Header' },
	timesheet: { status: ETimesheetStatus.APPROVED },
	isBillable: true
});
const tuesdayLate = logOf('tuesday-late', new Date(2026, 10, 3, 14, 0), 30, { employee: grace });
const tuesdayEarly = logOf('tuesday-early', new Date(2026, 10, 3, 8, 30), 45, { employee: ada });
const logs = [tuesdayLate, monday, tuesdayEarly];

describe('the rows of a Timesheets export', () => {
	it('writes one row per log, in the order the logs started', () => {
		const rows = timesheetExportRowsOf(logs);

		expect(rows.map((row) => row.id)).toEqual(['monday', 'tuesday-early', 'tuesday-late']);
	});

	it('writes the local day, the 24-hour start and end, the names, the status and the duration of a log', () => {
		const [row] = timesheetExportRowsOf([monday]);

		expect(row).toEqual({
			id: 'monday',
			dayKey: '2026-11-02',
			start: '09:05',
			end: '10:35',
			member: 'Ada Lovelace',
			project: 'Website',
			task: 'Header',
			status: ETimesheetStatus.APPROVED,
			isBillable: true,
			seconds: 5400,
			notes: ''
		});
	});

	it('writes the notes of a log, trimmed, as the CSV of the Timesheets page did before the XLSX and PDF exports', () => {
		const [row] = timesheetExportRowsOf([
			logOf('noted', new Date(2026, 10, 2, 9, 0), 30, { description: '  Fix the login page ' })
		]);

		expect(row.notes).toBe('Fix the login page');
	});

	it('leaves empty what a log does not have', () => {
		const [row] = timesheetExportRowsOf([tuesdayLate]);

		expect([row.project, row.task, row.status, row.isBillable]).toEqual(['', '', null, false]);
	});

	it('does not reorder the logs it is given', () => {
		timesheetExportRowsOf(logs);

		expect(logs.map((log) => log.id)).toEqual(['tuesday-late', 'monday', 'tuesday-early']);
	});
});

describe('the days of a printed Timesheets export', () => {
	it('groups the rows as the list does, the latest day first, each with its total', () => {
		const days = timesheetExportDaysOf(logs);

		const summary = days.map((day) => [day.key, day.seconds, day.rows.map((row) => row.id)]);
		expect(summary).toEqual([
			['2026-11-03', 4500, ['tuesday-early', 'tuesday-late']],
			['2026-11-02', 5400, ['monday']]
		]);
	});
});

describe('the totals of a Timesheets export', () => {
	it('adds up the logs given: their time, their number and the members behind them', () => {
		expect(timesheetExportTotalsOf(logs)).toEqual({ seconds: 9900, logCount: 3, memberCount: 2 });
	});

	it('agrees with the rows and with the days of the same logs', () => {
		const rows = timesheetExportRowsOf(logs);
		const days = timesheetExportDaysOf(logs);
		const totals = timesheetExportTotalsOf(logs);

		expect(secondsOf(rows)).toBe(totals.seconds);
		expect(secondsOf(days)).toBe(totals.seconds);
	});

	it('is zero for no log', () => {
		expect(timesheetExportTotalsOf([])).toEqual({ seconds: 0, logCount: 0, memberCount: 0 });
	});
});

describe('breaks in a Timesheets export (#5216)', () => {
	// Ada's day: work 9:00-12:00, a break 12:00-13:00 on the task she paused, then work 13:00-17:00
	const morning = logOf('morning', new Date(2026, 10, 4, 9, 0), 180, { employee: ada, task: { id: 't1', title: 'Header' } });
	const lunch = logOf('lunch', new Date(2026, 10, 4, 12, 0), 60, {
		employee: ada,
		task: { id: 't1', title: 'Header' },
		logType: ETimeLogType.BREAK
	});
	const afternoon = logOf('afternoon', new Date(2026, 10, 4, 13, 0), 240, { employee: ada });
	// Grace only took a break that day
	const graceBreak = logOf('grace-break', new Date(2026, 10, 4, 15, 0), 30, {
		employee: grace,
		logType: ETimeLogType.BREAK
	});
	const day = [morning, lunch, afternoon, graceBreak];

	it('writes no row for a break, which a file would read as work', () => {
		expect(timesheetExportRowsOf(day).map((row) => row.id)).toEqual(['morning', 'afternoon']);
		expect(timesheetExportDaysOf(day)[0].rows.map((row) => row.id)).toEqual(['morning', 'afternoon']);
	});

	it('closes on the worked time, the entries of work and the members who worked', () => {
		expect(timesheetExportTotalsOf(day)).toEqual({ seconds: 7 * 3600, logCount: 2, memberCount: 1 });
		expect(secondsOf(timesheetExportRowsOf(day))).toBe(7 * 3600);
	});
});
