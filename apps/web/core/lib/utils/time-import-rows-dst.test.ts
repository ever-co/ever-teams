/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In New York, where the clock moves from 02:00 to 03:00 on 8 March 2026: a time of that hour does not exist that day,
 * and JavaScript would move it forward without a word. A UTC host (CI) has no such day, and a test file cannot set
 * `TZ` itself: the environment does.
 */

import type { DateOrder } from './time-import-cells';
import { draftRowsOf, isReadyRow, type TimeImportContext, type TimeImportRow } from './time-import-rows';
import type { TimeImportCells, TimeImportSheetRow } from './time-import-sheet';

const HOUR = 3600;

/** A local time of Sunday 8 March 2026, the night New York enters summer time. */
const at = (hours: number, minutes = 0) => new Date(2026, 2, 8, hours, minutes);

const CONTEXT: TimeImportContext = {
	now: new Date(2026, 3, 1, 12),
	allowsFutureDates: false,
	requiresProject: false,
	teamHasDefaultProject: false,
	viewerEmployeeId: 'employee-viewer',
	viewerEmail: 'viewer@ever.co',
	canImportForOthers: false,
	matchesEveryTeamTask: false,
	members: [],
	projects: [],
	tasks: []
};

function draftOf(cells: Partial<TimeImportCells>, order: DateOrder = 'yearFirst'): TimeImportRow {
	const sheetRow: TimeImportSheetRow = {
		row: 2,
		cells: {
			date: '2026-03-08',
			startTime: '01:00',
			endDate: '',
			endTime: '',
			duration: '',
			project: '',
			task: '',
			notes: '',
			billable: '',
			memberEmail: '',
			...cells
		},
		extraCellCount: 0
	};
	return draftRowsOf([sheetRow], CONTEXT, order)[0];
}

function problemCodesOf(row: TimeImportRow) {
	return row.problems.map((problem) => problem.code);
}

describe('a time import row on the day the clock moves forward', () => {
	it('runs in a zone whose clock skips from 02:00 to 03:00 that night', () => {
		expect(at(0).getTimezoneOffset()).toBe(5 * 60);
		expect(at(12).getTimezoneOffset()).toBe(4 * 60);
		expect(at(2, 30).getHours()).toBe(3);
	});

	it('leaves out a start time the clock skips, instead of saving the row an hour later', () => {
		const row = draftOf({ startTime: '02:30', endTime: '04:30' });

		expect(problemCodesOf(row)).toEqual(['clockSkipped']);
		expect(row.entry).toBeNull();
	});

	it('leaves out an end time the clock skips', () => {
		const row = draftOf({ startTime: '01:00', endTime: '02:30' });

		expect(problemCodesOf(row)).toEqual(['clockSkipped']);
		expect(row.entry).toBeNull();
	});

	it('keeps a row whose times both exist, without the skipped hour in its length', () => {
		const row = draftOf({ startTime: '01:30', endTime: '03:30' });

		expect(isReadyRow(row)).toBe(true);
		expect(row.entry?.start).toEqual(at(1, 30));
		expect(row.entry?.end).toEqual(at(3, 30));
		expect(row.entry?.seconds).toBe(HOUR);
	});

	it('keeps a row given a duration across the change, as that much real time', () => {
		const row = draftOf({ startTime: '01:30', duration: '2:00' });

		expect(isReadyRow(row)).toBe(true);
		expect(row.entry?.end).toEqual(at(4, 30));
		expect(row.entry?.seconds).toBe(2 * HOUR);
	});
});

describe('a row from another tool on the day the clock moves forward', () => {
	it('leaves out an end the clock skips, on its own end date or written with its date', () => {
		const onEndDate = draftOf({ date: '2026-03-07', startTime: '23:00', endDate: '2026-03-08', endTime: '02:30' });
		const withItsDate = draftOf({ date: '2026-03-07', startTime: '23:00', endTime: '2026-03-08 02:30' });

		expect(problemCodesOf(onEndDate)).toEqual(['clockSkipped']);
		expect(problemCodesOf(withItsDate)).toEqual(['clockSkipped']);
	});

	it('leaves out a start the clock skips, written with its date day first or month first', () => {
		const dayFirst = draftOf({ date: '', startTime: '08/03/2026 02:30', endTime: '04:30' }, 'dayFirst');
		const monthFirst = draftOf({ date: '', startTime: '03/08/2026 02:30', endTime: '04:30' }, 'monthFirst');

		expect(problemCodesOf(dayFirst)).toEqual(['clockSkipped']);
		expect(problemCodesOf(monthFirst)).toEqual(['clockSkipped']);
	});

	it('keeps an entry that ends on its end date after the change, without the skipped hour in its length', () => {
		const row = draftOf({ date: '2026-03-07', startTime: '23:00', endDate: '2026-03-08', endTime: '03:30' });

		expect(isReadyRow(row)).toBe(true);
		expect(row.entry?.end).toEqual(at(3, 30));
		expect(row.entry?.seconds).toBe(3.5 * HOUR);
	});
});
