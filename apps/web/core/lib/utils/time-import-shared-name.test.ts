import { csvOf } from './dashboard-export';
import { timeImportReadingOf } from './time-import-columns';
import { timeImportReportCsvColumnsOf, type TimeImportReportLine } from './time-import-report';
import { draftRowsOf, type TimeImportContext } from './time-import-rows';
import type { TimeImportCells } from './time-import-sheet';

const VIEWER = { employeeId: 'employee-viewer', email: 'viewer@ever.co', name: 'Vera Viewer' };
const NAMESAKE = { employeeId: 'employee-namesake', email: 'vera.2@ever.co', name: 'Vera Viewer' };

function contextOf(overrides: Partial<TimeImportContext> = {}): TimeImportContext {
	return {
		now: new Date(2026, 10, 5, 18),
		allowsFutureDates: false,
		requiresProject: false,
		teamHasDefaultProject: false,
		viewerEmployeeId: VIEWER.employeeId,
		viewerEmail: VIEWER.email,
		canImportForOthers: true,
		matchesEveryTeamTask: true,
		members: [VIEWER, NAMESAKE],
		projects: [],
		tasks: [],
		...overrides
	};
}

function cellsOf(cells: Partial<TimeImportCells>): TimeImportCells {
	return {
		date: '2026-11-03',
		startTime: '09:00',
		endDate: '',
		endTime: '10:00',
		duration: '',
		project: '',
		task: '',
		notes: '',
		billable: '',
		memberEmail: '',
		...cells
	};
}

function draftOf(cells: Partial<TimeImportCells>, overrides: Partial<TimeImportContext> = {}) {
	return draftRowsOf([{ row: 2, cells: cellsOf(cells), extraCellCount: 0 }], contextOf(overrides))[0];
}

describe('a member named in an import row by a name the viewer shares with another member', () => {
	it('names nobody for a manager: the row is left out as ambiguous', () => {
		expect(draftOf({ memberEmail: 'Vera Viewer' }).problems).toEqual([{ code: 'memberAmbiguous', count: 2 }]);
	});
	it('names nobody for a member who imports only their own time either', () => {
		expect(draftOf({ memberEmail: 'Vera Viewer' }, { canImportForOthers: false }).problems).toEqual([
			{ code: 'memberAmbiguous', count: 2 }
		]);
	});
	it('is the viewer when the row names the viewer by email', () => {
		expect(draftOf({ memberEmail: 'viewer@ever.co' }).entry?.employeeId).toBe(VIEWER.employeeId);
	});
	it('is the viewer when only the viewer holds that name', () => {
		expect(draftOf({ memberEmail: 'vera viewer' }, { members: [VIEWER] }).entry?.employeeId).toBe(
			VIEWER.employeeId
		);
	});
});

describe('the import report of a row whose end date disagrees with its end time', () => {
	const lineOf = (cells: Partial<TimeImportCells>, row = 2): TimeImportReportLine => ({
		row,
		cells: cellsOf(cells),
		status: 'Left out',
		reason: 'x'
	});
	it('a row left out for its end day stays left out once its report is imported again', () => {
		const conflict = lineOf({ startTime: '2026-11-03 09:00', endDate: '2026-11-04', endTime: '2026-11-03 10:00' });
		const sameDayConflict = lineOf({ endDate: '2026-11-03', endTime: '2026-11-04 08:00' }, 3);
		const agrees = lineOf({ endDate: '2026-11-03', endTime: '2026-11-03 10:00' }, 4);
		const report = csvOf([conflict, sameDayConflict, agrees], timeImportReportCsvColumnsOf(false));
		const reading = timeImportReadingOf(report);
		if (reading.kind !== 'sheet') throw new Error(reading.kind);
		const rows = draftRowsOf(reading.sheet.rows, contextOf(), reading.sheet.dateOrder);
		expect(rows[0].problems.length).toBeGreaterThan(0);
		expect(rows[1].problems.length).toBeGreaterThan(0);
		expect(rows[2].problems).toEqual([]);
		expect(reading.sheet.rows[2].cells.endTime).toBe('2026-11-03 10:00');
	});
});

describe('a start column whose first value cannot be read', () => {
	it('does not keep the date of the other rows from being read', () => {
		const reading = timeImportReadingOf(
			'Start,End,Description\nn/a,2026-11-03 10:30,Broken\n2026-11-03 09:00,2026-11-03 10:30,Pairing\n'
		);
		expect(reading.kind).toBe('sheet');
	});
	it('still reads a start column of times alone as times', () => {
		const reading = timeImportReadingOf('Start,End,Description\n09:00,10:30,Pairing\n2026-11-03 09:00,10:30,x\n');
		expect(reading).toMatchObject({ kind: 'refused', problem: { code: 'missingColumns' } });
	});
});
