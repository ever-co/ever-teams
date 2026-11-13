import { csvOf } from './dashboard-export';
import { timeImportReadingOf } from './time-import-columns';
import {
	timeImportReportCsvColumnsOf,
	timeImportReportFileNameOf,
	timeImportTemplateCsvColumnsOf,
	type TimeImportReportLine
} from './time-import-report';
import { draftRowsOf, type TimeImportContext } from './time-import-rows';
import type { TimeImportCells } from './time-import-sheet';

const VIEWER_CONTEXT: TimeImportContext = {
	now: new Date(2026, 10, 5, 18),
	allowsFutureDates: false,
	requiresProject: false,
	teamHasDefaultProject: false,
	viewerEmployeeId: 'employee-viewer',
	viewerEmail: 'viewer@ever.co',
	canImportForOthers: false,
	matchesEveryTeamTask: true,
	members: [],
	projects: [],
	tasks: []
};

function lineOf(cells: Partial<TimeImportCells>, row = 2): TimeImportReportLine {
	return {
		row,
		cells: {
			date: '2026-11-03',
			startTime: '09:00',
			endDate: '',
			endTime: '10:30',
			duration: '',
			project: 'Website',
			task: 'Fix login',
			notes: '',
			billable: 'yes',
			memberEmail: '',
			...cells
		},
		status: 'Left out',
		reason: 'No task of this team has this title.'
	};
}

describe('the template of a time import', () => {
	it('is the header line alone, without the member email for a viewer who imports their own time', () => {
		const template = csvOf([], timeImportTemplateCsvColumnsOf(false));

		expect(template).toBe('date,start time,end time,duration,project,task,notes,billable');
	});

	it('ends with the member email for a viewer who may add time for someone else', () => {
		const template = csvOf([], timeImportTemplateCsvColumnsOf(true));

		expect(template).toBe('date,start time,end time,duration,project,task,notes,billable,member email');
	});

	it('is a file the import reads, and refuses only for having no row', () => {
		const template = csvOf([], timeImportTemplateCsvColumnsOf(true));

		expect(timeImportReadingOf(template)).toEqual({ kind: 'refused', problem: { code: 'noRows' } });
	});
});

describe('the report of a time import', () => {
	it('writes the row, its cells as the file had them, its status and its reason', () => {
		const report = csvOf(
			[lineOf({ notes: 'Pairing, then review' }, 7)],
			timeImportReportCsvColumnsOf(false, false)
		);

		expect(report.split('\r\n')).toEqual([
			'row,date,start time,end time,duration,project,task,notes,billable,status,reason',
			'7,2026-11-03,09:00,10:30,,Website,Fix login,"Pairing, then review",yes,Left out,No task of this team has this title.'
		]);
	});

	it('neutralises a cell a spreadsheet would run as a formula', () => {
		const line = lineOf({ project: '=HYPERLINK("http://x")', task: '+1', notes: '-2+3', memberEmail: '@SUM(A1)' });
		const [, written] = csvOf([line], timeImportReportCsvColumnsOf(true)).split('\r\n');

		expect(written).toContain(`"'=HYPERLINK(""http://x"")"`);
		expect(written).toContain(",'+1,");
		expect(written).toContain(",'-2+3,");
		expect(written).toContain(",'@SUM(A1),");
	});

	it('can be corrected and imported again: its own columns are not counted as unknown', () => {
		const report = csvOf(
			[lineOf({}, 2), lineOf({ startTime: '11:00', endTime: '12:00' }, 3)],
			timeImportReportCsvColumnsOf(true)
		);
		const reading = timeImportReadingOf(report);

		expect(reading).toMatchObject({
			kind: 'sheet',
			sheet: {
				ignoredHeaders: [],
				rows: [{ cells: { startTime: '09:00' } }, { cells: { startTime: '11:00' } }]
			}
		});
	});

	it('writes a separate end date before the end time, so an entry that ends the next day comes back as one', () => {
		const overnight = lineOf({ startTime: '22:00', endDate: '2026-11-04', endTime: '01:30' });
		const oneColumn = lineOf({ endDate: '2026-11-04 01:30', endTime: '2026-11-04 01:30' }, 3);
		const sameDay = lineOf({}, 4);
		const report = csvOf([overnight, oneColumn, sameDay], timeImportReportCsvColumnsOf(false));
		const [header, overnightLine, oneColumnLine, sameDayLine] = report.split('\r\n');

		expect(header).toContain(',start time,end date,end time,');
		expect(overnightLine).toContain(',22:00,2026-11-04,01:30,');
		expect(oneColumnLine).toContain(',09:00,2026-11-04 01:30,2026-11-04 01:30,');
		expect(sameDayLine).toContain(',09:00,,10:30,');
		expect(timeImportReadingOf(report)).toMatchObject({
			kind: 'sheet',
			sheet: {
				rows: [
					{ cells: { endDate: '2026-11-04', endTime: '01:30' } },
					{},
					{ cells: { endDate: '', endTime: '10:30' } }
				]
			}
		});
	});

	it('keeps an end date that disagrees with the date of its end time, or cannot be read, so the row stays left out', () => {
		const byEndTime = { project: '', task: '' };
		const otherDay = lineOf({ ...byEndTime, endDate: '2026-11-04', endTime: '2026-11-03 10:00' });
		const unreadable = lineOf({ ...byEndTime, endDate: '04.11.26', endTime: '2026-11-03 10:00' }, 3);
		const report = csvOf([otherDay, unreadable], timeImportReportCsvColumnsOf(false));
		const reading = timeImportReadingOf(report);
		if (reading.kind !== 'sheet') {
			throw new Error(reading.kind);
		}
		const [otherDayRow, unreadableRow] = draftRowsOf(reading.sheet.rows, VIEWER_CONTEXT, reading.sheet.dateOrder);

		expect(otherDayRow.problems).toEqual([{ code: 'endDayMismatch' }]);
		expect(unreadableRow.problems).toEqual([{ code: 'endDateUnreadable' }]);
	});

	it('drops the end date column for a file that gave none', () => {
		const report = csvOf([lineOf({})], timeImportReportCsvColumnsOf(false, false));

		expect(report).not.toContain('end date');
	});

	it('keeps an end date beside a duration as the file wrote it, so a row left out for it is left out again', () => {
		const byDuration = { endTime: '', project: '', task: '' };
		const unreadable = lineOf({ ...byDuration, endDate: '04.11.26', duration: '1:00' });
		const overnight = lineOf({ ...byDuration, startTime: '23:00', endDate: '2026-11-04', duration: '2:00' }, 3);
		const report = csvOf([unreadable, overnight], timeImportReportCsvColumnsOf(false));
		const reading = timeImportReadingOf(report);
		if (reading.kind !== 'sheet') {
			throw new Error(reading.kind);
		}
		const [unreadableRow, overnightRow] = draftRowsOf(reading.sheet.rows, VIEWER_CONTEXT, reading.sheet.dateOrder);

		expect(unreadableRow.cells).toMatchObject({ endDate: '04.11.26', endTime: '', duration: '1:00' });
		expect(unreadableRow.problems).toEqual([{ code: 'endDateUnreadable' }]);
		expect(overnightRow.entry).toMatchObject({
			start: new Date(2026, 10, 3, 23),
			end: new Date(2026, 10, 4, 1)
		});
	});

	it('is named after the local day of the import', () => {
		expect(timeImportReportFileNameOf(new Date(2026, 10, 12, 23, 30))).toBe('time-import-report-2026-11-12.csv');
	});
});
