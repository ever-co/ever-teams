import { timeImportReadingOf } from './time-import-columns';
import { TIME_IMPORT_MAX_ROWS } from './time-import-sheet';

const HEADER = 'date,start time,end time,duration,project,task,notes,billable';

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
