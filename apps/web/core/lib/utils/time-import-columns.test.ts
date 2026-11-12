import { dateOrderReadingOf, timeImportReadingOf } from './time-import-columns';
import { draftRowsOf, type TimeImportContext } from './time-import-rows';
import { TIME_IMPORT_MAX_ROWS, timeImportTableOf, type TimeImportMapping } from './time-import-sheet';

const HEADER = 'date,start time,end time,duration,project,task,notes,billable';

const CONTEXT: TimeImportContext = {
	now: new Date(2026, 10, 12, 18, 0),
	allowsFutureDates: false,
	requiresProject: false,
	teamHasDefaultProject: false,
	viewerEmployeeId: 'employee-viewer',
	viewerEmail: 'viewer@ever.co',
	canImportForOthers: false,
	matchesEveryTeamTask: false,
	members: [],
	projects: [{ id: 'project-website', name: 'Website' }],
	tasks: []
};

const NOV_3_AT_9 = new Date(2026, 10, 3, 9, 0);

function sheetOf(text: string) {
	const reading = timeImportReadingOf(text);
	if (reading.kind !== 'sheet') {
		throw new Error(`The file was not read straight: ${reading.kind}`);
	}
	return reading.sheet;
}

function problemOf(text: string) {
	const reading = timeImportReadingOf(text);
	if (reading.kind !== 'refused') {
		return null;
	}
	return reading.problem;
}

describe('timeImportReadingOf', () => {
	it('reads each line under the header as a row, cells trimmed', () => {
		const sheet = sheetOf(`${HEADER}\n2026-11-03, 09:00 ,10:30,,Website,Fix login,"Pairing, then review",yes\n`);

		expect(sheet.rows).toEqual([
			{
				row: 2,
				cells: {
					date: '2026-11-03',
					startTime: '09:00',
					endDate: '',
					endTime: '10:30',
					duration: '',
					project: 'Website',
					task: 'Fix login',
					notes: 'Pairing, then review',
					billable: 'yes',
					memberEmail: ''
				},
				extraCellCount: 0
			}
		]);
		expect(sheet.ignoredHeaders).toEqual([]);
	});

	it('matches headers in any order, letter case and word separator aside', () => {
		const sheet = sheetOf(
			'Task;START_TIME;Date;End-Time;Member Email\nFix login;09:00;2026-11-03;10:00;ada@ever.co\n'
		);

		expect(sheet.rows[0].cells).toMatchObject({
			date: '2026-11-03',
			startTime: '09:00',
			endTime: '10:00',
			task: 'Fix login',
			memberEmail: 'ada@ever.co'
		});
	});

	it('reads a missing cell at the end of a line as empty', () => {
		const sheet = sheetOf(`${HEADER}\n2026-11-03,09:00,10:00\n`);

		expect(sheet.rows[0].cells.notes).toBe('');
		expect(sheet.rows[0].extraCellCount).toBe(0);
	});

	it('counts the filled cells past the last header', () => {
		const sheet = sheetOf('date,start time,duration,notes\n2026-11-03,09:00,1h,Fixed it, then deployed\n');

		expect(sheet.rows[0].extraCellCount).toBe(1);
	});

	it('names the columns it does not read, but not the ones of its own report', () => {
		const sheet = sheetOf(
			'row,date,start time,duration,client,status,reason\n2,2026-11-03,09:00,1h,Acme,Left out,x\n'
		);

		expect(sheet.ignoredHeaders).toEqual(['client']);
		expect(sheet.rows[0].cells.date).toBe('2026-11-03');
	});

	it('refuses a file without the columns every row needs, and names them', () => {
		expect(problemOf('project,task,notes\nWebsite,Fix login,x\n')).toEqual({
			code: 'missingColumns',
			columns: ['date', 'startTime', 'endOrDuration']
		});
		expect(problemOf('date,start time\n2026-11-03,09:00\n')).toEqual({
			code: 'missingColumns',
			columns: ['endOrDuration']
		});
	});

	it('accepts a file with a duration column and no end time column', () => {
		expect(problemOf('date,start time,duration\n2026-11-03,09:00,1h\n')).toBeNull();
	});

	it('refuses a file where a column appears twice', () => {
		expect(problemOf('date,start time,duration,Date\n2026-11-03,09:00,1h,x\n')).toEqual({
			code: 'duplicateColumn',
			header: 'date'
		});
	});

	it('names the missing columns of a file before its missing rows', () => {
		expect(problemOf('project,task\n')).toEqual({
			code: 'missingColumns',
			columns: ['date', 'startTime', 'endOrDuration']
		});
		expect(problemOf(`${HEADER}\n\n`)).toEqual({ code: 'noRows' });
	});

	it('refuses a file over the row limit', () => {
		const line = '2026-11-03,09:00,10:00';
		const overLimit = Array.from({ length: TIME_IMPORT_MAX_ROWS + 1 }, () => line).join('\n');

		expect(problemOf(`date,start time,end time\n${overLimit}\n`)).toEqual({
			code: 'tooManyRows',
			count: TIME_IMPORT_MAX_ROWS + 1
		});
	});

	it('refuses a file where a quoted cell is never closed', () => {
		expect(problemOf('date,start time,duration,notes\n2026-11-03,09:00,1h,"open\n')).toEqual({
			code: 'unclosedQuote',
			row: 2
		});
	});
});

describe('timeImportReadingOf for a file from another tool', () => {
	it('reads the usual headers of a time export as the template reads its own', () => {
		const exported = sheetOf(
			'Start date,Start time,End date,End time,Project,Description,Billable\n2026-11-03,09:00,2026-11-03,10:30,Website,Pairing,Yes\n'
		);
		const template = sheetOf(
			'date,start time,end time,project,notes,billable\n2026-11-03,09:00,10:30,Website,Pairing,yes\n'
		);
		const [exportedRow] = draftRowsOf(exported.rows, CONTEXT, exported.dateOrder);
		const [templateRow] = draftRowsOf(template.rows, CONTEXT, template.dateOrder);

		expect(exported.ignoredHeaders).toEqual([]);
		expect(exportedRow.problems).toEqual([]);
		expect(exportedRow.entry).toEqual(templateRow.entry);
	});

	it('reads headers whatever their letter case, spacing or punctuation', () => {
		const sheet = sheetOf('day,startTime,End-Time,Duration (h),E-mail\n2026-11-03,09:00,10:30,1.5,ada@ever.co\n');

		expect(sheet.rows[0].cells).toMatchObject({
			date: '2026-11-03',
			startTime: '09:00',
			endTime: '10:30',
			duration: '1.5',
			memberEmail: 'ada@ever.co'
		});
	});

	it('reads the date of an entry from a start column that holds a date and a time', () => {
		const sheet = sheetOf('Start,End,Description\n2026-11-03 09:00,2026-11-03 10:30,Pairing\n');
		const [row] = draftRowsOf(sheet.rows, CONTEXT, sheet.dateOrder);

		expect(sheet.rows[0].cells).toMatchObject({ date: '2026-11-03 09:00', endDate: '2026-11-03 10:30' });
		expect(row.entry).toMatchObject({ start: NOV_3_AT_9, notes: 'Pairing' });
	});

	it('tells day first from a day above 12, and reads 03/11/2026 as 3 November then', () => {
		const sheet = sheetOf('Date,From,To\n25/10/2026,09:00,10:00\n03/11/2026,09:00,10:00\n');
		const rows = draftRowsOf(sheet.rows, CONTEXT, sheet.dateOrder);

		expect(sheet.dateOrder).toBe('dayFirst');
		expect(rows[1].entry?.start).toEqual(NOV_3_AT_9);
	});

	it('tells month first from a second number above 12', () => {
		expect(sheetOf('Date,From,To\n10/25/2026,09:00,10:00\n').dateOrder).toBe('monthFirst');
	});

	it('keeps reading year first a template whose one date is written another way, and leaves that row out', () => {
		const sheet = sheetOf('date,start time,end time\n2026-11-03,09:00,10:00\n03/11/2026,11:00,12:00\n');
		const rows = draftRowsOf(sheet.rows, CONTEXT, sheet.dateOrder);

		expect(sheet.dateOrder).toBe('yearFirst');
		expect(rows[1].problems).toEqual([{ code: 'dateUnreadable', order: 'yearFirst' }]);
	});

	it('refuses a file whose dates are written two ways, with the row that shows it', () => {
		expect(problemOf('Date,From,To\n25/10/2026,09:00,10:00\n10/25/2026,09:00,10:00\n')).toEqual({
			code: 'mixedDates',
			firstRow: 2,
			firstValue: '25/10/2026',
			row: 3,
			value: '10/25/2026'
		});
	});

	it('names the columns of a time export it does not read', () => {
		const sheet = sheetOf('Date,Start,End,Client,Tags,Amount,Rate\n2026-11-03,09:00,10:00,Acme,web,150,100\n');

		expect(sheet.ignoredHeaders).toEqual(['Client', 'Tags', 'Amount', 'Rate']);
	});

	it('reads a field from the first of two headers that name it, and refuses one header written twice', () => {
		const twoNames = sheetOf('Date,Day,Start,End\n2026-11-03,2026-11-04,09:00,10:00\n');

		expect(twoNames.rows[0].cells.date).toBe('2026-11-03');
		expect(twoNames.ignoredHeaders).toEqual(['Day']);
		expect(problemOf('Start date,Start time,End time,Start Date\n2026-11-03,09:00,10:00,x\n')).toEqual({
			code: 'duplicateColumn',
			header: 'start date'
		});
	});
});

describe('dateOrderReadingOf', () => {
	const MAPPING: TimeImportMapping = {
		date: 0,
		startTime: 1,
		endDate: null,
		endTime: 2,
		duration: null,
		project: null,
		task: null,
		notes: null,
		billable: null,
		memberEmail: null
	};

	function tableOf(text: string) {
		const reading = timeImportTableOf(text);
		if (!reading.table) {
			throw new Error(`The file was refused: ${reading.problem.code}`);
		}
		return reading.table;
	}

	it('tells nothing when the file writes no date', () => {
		expect(dateOrderReadingOf(tableOf('date,start,end\n,09:00,10:00\n'), MAPPING)).toEqual({ kind: 'none' });
	});

	it('waits for a choice when every date fits both a day first and a month first', () => {
		const table = tableOf('date,start,end\n03/11/2026,09:00,10:00\n05/11/2026,09:00,10:00\n');

		expect(dateOrderReadingOf(table, MAPPING)).toEqual({ kind: 'ambiguous', row: 2, value: '03/11/2026' });
	});

	it('reads the date written before the time of a start', () => {
		const table = tableOf('date,start,end\n,25/10/2026 09:00,10:00\n');

		expect(dateOrderReadingOf(table, MAPPING)).toEqual({
			kind: 'told',
			order: 'dayFirst',
			row: 2,
			value: '25/10/2026'
		});
	});
});
