import {
	TIME_IMPORT_MAX_BYTES,
	TIME_IMPORT_MAX_ROWS,
	timeImportFileRefusalOf,
	timeImportSheetOf,
	timeImportTemplateColumnsOf
} from './time-import-sheet';

const HEADER = 'date,start time,end time,duration,project,task,notes,billable';

function sheetOf(text: string) {
	const result = timeImportSheetOf(text);
	if (!result.sheet) {
		throw new Error(`The file was refused: ${result.problem.code}`);
	}
	return result.sheet;
}

describe('timeImportFileRefusalOf', () => {
	it('accepts a .csv file within the size limit, whatever the case of its extension', () => {
		expect(timeImportFileRefusalOf('october.csv', 2048)).toBeNull();
		expect(timeImportFileRefusalOf('OCTOBER.CSV', TIME_IMPORT_MAX_BYTES)).toBeNull();
	});

	it('refuses any other kind of file', () => {
		expect(timeImportFileRefusalOf('october.xlsx', 2048)).toEqual({ code: 'notCsv' });
		expect(timeImportFileRefusalOf('october.csv.exe', 2048)).toEqual({ code: 'notCsv' });
		expect(timeImportFileRefusalOf('october', 2048)).toEqual({ code: 'notCsv' });
	});

	it('refuses a file over the size limit', () => {
		expect(timeImportFileRefusalOf('october.csv', TIME_IMPORT_MAX_BYTES + 1)).toEqual({ code: 'tooLarge' });
	});
});

describe('timeImportTemplateColumnsOf', () => {
	it('leaves the member email out for a viewer who only imports their own time', () => {
		expect(timeImportTemplateColumnsOf(false)).toEqual([
			'date',
			'startTime',
			'endTime',
			'duration',
			'project',
			'task',
			'notes',
			'billable'
		]);
	});

	it('ends with the member email for a viewer who may add time for someone else', () => {
		expect(timeImportTemplateColumnsOf(true).at(-1)).toBe('memberEmail');
	});
});

describe('timeImportSheetOf', () => {
	it('reads each line under the header as a row, cells trimmed', () => {
		const sheet = sheetOf(`${HEADER}\n2026-11-03, 09:00 ,10:30,,Website,Fix login,"Pairing, then review",yes\n`);

		expect(sheet.rows).toEqual([
			{
				row: 2,
				cells: {
					date: '2026-11-03',
					startTime: '09:00',
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

	it('numbers rows as a spreadsheet does, blank lines counted and left out', () => {
		const sheet = sheetOf('date,start time,duration\n2026-11-03,09:00,1h\n\n , ,\n2026-11-04,09:00,1h\n');

		expect(sheet.rows.map((row) => row.row)).toEqual([2, 5]);
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

	it('refuses a file with no line at all', () => {
		expect(timeImportSheetOf('').problem).toEqual({ code: 'empty' });
		expect(timeImportSheetOf('\n\n  \n').problem).toEqual({ code: 'empty' });
	});

	it('refuses a file without the columns every row needs, and names them', () => {
		expect(timeImportSheetOf('project,task,notes\nWebsite,Fix login,x\n').problem).toEqual({
			code: 'missingColumns',
			columns: ['date', 'startTime', 'endOrDuration']
		});
		expect(timeImportSheetOf('date,start time\n2026-11-03,09:00\n').problem).toEqual({
			code: 'missingColumns',
			columns: ['endOrDuration']
		});
	});

	it('accepts a file with a duration column and no end time column', () => {
		expect(timeImportSheetOf('date,start time,duration\n2026-11-03,09:00,1h\n').problem).toBeNull();
	});

	it('refuses a file where a column appears twice', () => {
		expect(timeImportSheetOf('date,start time,duration,Date\n2026-11-03,09:00,1h,x\n').problem).toEqual({
			code: 'duplicateColumn',
			header: 'date'
		});
	});

	it('refuses a file with a header and no row', () => {
		expect(timeImportSheetOf(`${HEADER}\n\n`).problem).toEqual({ code: 'noRows' });
	});

	it('refuses a file over the row limit and tells how many rows it has', () => {
		const line = '2026-11-03,09:00,10:00';
		const atLimit = Array.from({ length: TIME_IMPORT_MAX_ROWS }, () => line).join('\n');
		const overLimit = `${atLimit}\n${line}`;

		expect(timeImportSheetOf(`date,start time,end time\n${atLimit}\n`).problem).toBeNull();
		expect(timeImportSheetOf(`date,start time,end time\n${overLimit}\n`).problem).toEqual({
			code: 'tooManyRows',
			count: TIME_IMPORT_MAX_ROWS + 1
		});
	});

	it('refuses a file where a quoted cell is never closed, with its row', () => {
		expect(timeImportSheetOf('date,start time,duration,notes\n2026-11-03,09:00,1h,"open\n').problem).toEqual({
			code: 'unclosedQuote',
			row: 2
		});
	});
});
