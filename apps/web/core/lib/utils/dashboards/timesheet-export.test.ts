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
