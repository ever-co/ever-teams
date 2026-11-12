import {
	dateOrderReadingOf,
	resolvedDateOrderOf,
	timeImportColumnsStepOf,
	timeImportReadingOf
} from './time-import-columns';
import { draftRowsOf, type TimeImportContext } from './time-import-rows';
import {
	NO_TIME_IMPORT_COLUMNS,
	TIME_IMPORT_MAX_ROWS,
	timeImportTableOf,
	type TimeImportField,
	type TimeImportMapping
} from './time-import-sheet';

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

function tableOf(text: string) {
	const reading = timeImportTableOf(text);
	if (!reading.table) {
		throw new Error(`The file was refused: ${reading.problem.code}`);
	}
	return reading.table;
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

	it('asks the member when two headers name the same part, and refuses one header written twice', () => {
		const twoNames = timeImportReadingOf('Date,Day,Start,End\n2026-11-03,2026-11-04,09:00,10:00\n');

		expect(twoNames).toMatchObject({ kind: 'columns', choice: { mapping: { date: 0, startTime: 2, endTime: 3 } } });
		expect(problemOf('Start date,Start time,End time,Start Date\n2026-11-03,09:00,10:00,x\n')).toEqual({
			code: 'duplicateColumn',
			header: 'start date'
		});
	});
});

describe('timeImportReadingOf, the Columns step', () => {
	const UNKNOWN = 'Datum,Beginn,Ende,Kunde\n03/11/2026,09:00,10:30,Acme\n05/11/2026,13:00,14:00,Acme\n';

	it('stops on the Columns step for a file whose headers it does not know, with nothing chosen', () => {
		const reading = timeImportReadingOf(UNKNOWN);

		expect(reading).toMatchObject({
			kind: 'columns',
			choice: { mapping: NO_TIME_IMPORT_COLUMNS, dateOrder: null }
		});
	});

	it('stops on the Columns step when every date fits two formats, with the columns it recognised', () => {
		const reading = timeImportReadingOf('Date,Start,End\n03/11/2026,09:00,10:30\n');

		expect(reading).toMatchObject({ kind: 'columns', choice: { mapping: { date: 0, startTime: 1, endTime: 2 } } });
	});

	it('stops on the step rather than refusing when a column it does not know could give what is missing', () => {
		expect(timeImportReadingOf('Date,Start,Fin\n2026-11-03,09:00,10:30\n').kind).toBe('columns');
		expect(problemOf('Date,Start,Client\n2026-11-03,09:00,Acme\n')).toEqual({
			code: 'missingColumns',
			columns: ['endOrDuration']
		});
	});

	it('reads a file through the choice kept for its headers, without the step', () => {
		const kept = {
			mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2 },
			dateOrder: 'dayFirst' as const
		};
		const reading = timeImportReadingOf(UNKNOWN, () => kept);

		expect(reading).toMatchObject({
			kind: 'sheet',
			readsAsTemplate: false,
			sheet: { dateOrder: 'dayFirst', ignoredHeaders: ['Kunde'] }
		});
	});

	it('shows the kept choice again when it does not settle the file, as a format never chosen', () => {
		const kept = { mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2 }, dateOrder: null };

		expect(timeImportReadingOf(UNKNOWN, () => kept)).toMatchObject({ kind: 'columns', choice: kept });
	});

	it('tells the template, read with its own headers and dates year first, from any other file', () => {
		const template = timeImportReadingOf(`${HEADER}\n2026-11-03,09:00,10:30,,,,,\n`);
		const exported = timeImportReadingOf('Start date,Start time,End time\n2026-11-03,09:00,10:30\n');
		const dayFirst = timeImportReadingOf('date,start time,end time\n25/10/2026,09:00,10:30\n');

		expect(template).toMatchObject({ kind: 'sheet', readsAsTemplate: true });
		expect(exported).toMatchObject({ kind: 'sheet', readsAsTemplate: false });
		expect(dayFirst).toMatchObject({ kind: 'sheet', readsAsTemplate: false });
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

describe('resolvedDateOrderOf', () => {
	it('reads the format a file tells, and the template one when it writes no date', () => {
		const told = { kind: 'told', order: 'monthFirst', row: 2, value: '10/25/2026' } as const;

		expect(resolvedDateOrderOf(told, 'dayFirst')).toBe('monthFirst');
		expect(resolvedDateOrderOf({ kind: 'none' }, null)).toBe('yearFirst');
	});

	it('takes the member choice between day first and month first only when the dates fit both', () => {
		const ambiguous = { kind: 'ambiguous', row: 2, value: '03/11/2026' } as const;

		expect(resolvedDateOrderOf(ambiguous, 'dayFirst')).toBe('dayFirst');
		expect(resolvedDateOrderOf(ambiguous, 'yearFirst')).toBeNull();
		expect(resolvedDateOrderOf(ambiguous, null)).toBeNull();
	});

	it('settles nothing for a file whose dates are written two ways', () => {
		const mixed = { kind: 'mixed', firstRow: 2, firstValue: '25/10/2026', row: 3, value: '10/25/2026' } as const;

		expect(resolvedDateOrderOf(mixed, 'dayFirst')).toBeNull();
	});
});

describe('timeImportColumnsStepOf', () => {
	const table = tableOf(
		'Datum,Beginn,Ende,Kunde,Notiz\n03/11/2026,09:00,10:30,Acme,Pairing\n05/11/2026,13:00,14:00,Acme,\n06/11/2026,08:00,09:00,,Review\n07/11/2026,08:00,09:00,,\n'
	);
	const chosen: TimeImportMapping = { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2, notes: 4 };

	it('says what is missing before the rows can be checked', () => {
		const step = timeImportColumnsStepOf(table, { mapping: NO_TIME_IMPORT_COLUMNS, dateOrder: null });

		expect(step.missing).toEqual(['date', 'startTime', 'endOrDuration']);
		expect(step.blocker).toBe('missing');
		expect(step.leftOutHeaders).toEqual(['Datum', 'Beginn', 'Ende', 'Kunde', 'Notiz']);
	});

	it('shows the first value of each chosen column, the columns left out and the first rows of the file', () => {
		const step = timeImportColumnsStepOf(table, { mapping: chosen, dateOrder: 'dayFirst' });
		const sampleOf = (field: TimeImportField) => step.fields.find((item) => item.field === field)?.sample;

		expect(sampleOf('date')).toBe('03/11/2026');
		expect(sampleOf('notes')).toBe('Pairing');
		expect(sampleOf('project')).toBeNull();
		expect(step.leftOutHeaders).toEqual(['Kunde']);
		expect(step.firstRows.map((record) => record.row)).toEqual([2, 3, 4]);
		expect(step.rowCount).toBe(4);
	});

	it('asks how the dates are written while every date fits both a day first and a month first', () => {
		expect(timeImportColumnsStepOf(table, { mapping: chosen, dateOrder: null }).blocker).toBe('dateOrder');
		expect(timeImportColumnsStepOf(table, { mapping: chosen, dateOrder: 'monthFirst' })).toMatchObject({
			blocker: null,
			dateOrder: 'monthFirst'
		});
	});

	it('cannot go on while the chosen columns hold dates written two ways', () => {
		const mixed = tableOf('Datum,Beginn,Ende\n25/10/2026,09:00,10:00\n10/25/2026,09:00,10:00\n');
		const mapping: TimeImportMapping = { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2 };
		const step = timeImportColumnsStepOf(mixed, { mapping, dateOrder: 'dayFirst' });

		expect(step.blocker).toBe('mixedDates');
		expect(step.dates).toMatchObject({ kind: 'mixed', row: 3, value: '10/25/2026' });
	});
});
