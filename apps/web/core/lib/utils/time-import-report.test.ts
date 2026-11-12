import { csvOf } from './dashboard-export';
import { timeImportReadingOf } from './time-import-columns';
import {
	timeImportReportCsvColumnsOf,
	timeImportReportFileNameOf,
	timeImportTemplateCsvColumnsOf,
	type TimeImportReportLine
} from './time-import-report';
import type { TimeImportCells } from './time-import-sheet';

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
		const report = csvOf([lineOf({ notes: 'Pairing, then review' }, 7)], timeImportReportCsvColumnsOf(false));

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

	it('is named after the local day of the import', () => {
		expect(timeImportReportFileNameOf(new Date(2026, 10, 12, 23, 30))).toBe('time-import-report-2026-11-12.csv');
	});
});
