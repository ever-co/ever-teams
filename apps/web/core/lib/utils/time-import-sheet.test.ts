import {
	TIME_IMPORT_MAX_BYTES,
	TIME_IMPORT_MAX_ROWS,
	rowCountProblemOf,
	timeImportFileRefusalOf,
	timeImportTableOf,
	timeImportTemplateColumnsOf
} from './time-import-sheet';

function tableOf(text: string) {
	const result = timeImportTableOf(text);
	if (!result.table) {
		throw new Error(`The file was refused: ${result.problem.code}`);
	}
	return result.table;
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

describe('timeImportTableOf', () => {
	it('reads the first line that is not blank as the header, trimmed, and the lines under it as they are', () => {
		const table = tableOf('\n Date , start time\n2026-11-03, 09:00 \n');

		expect(table.headers).toEqual(['Date', 'start time']);
		expect(table.records).toEqual([{ row: 3, cells: ['2026-11-03', ' 09:00 '] }]);
	});

	it('numbers rows as a spreadsheet does, blank lines counted and left out', () => {
		const table = tableOf('date,start time,duration\n2026-11-03,09:00,1h\n\n , ,\n2026-11-04,09:00,1h\n');

		expect(table.records.map((record) => record.row)).toEqual([2, 5]);
	});

	it('refuses a file with no line at all', () => {
		expect(timeImportTableOf('').problem).toEqual({ code: 'empty' });
		expect(timeImportTableOf('\n\n  \n').problem).toEqual({ code: 'empty' });
	});

	it('refuses a file where a quoted cell is never closed, with its row', () => {
		expect(timeImportTableOf('date,start time,duration,notes\n2026-11-03,09:00,1h,"open\n').problem).toEqual({
			code: 'unclosedQuote',
			row: 2
		});
	});
});

describe('rowCountProblemOf', () => {
	it('refuses a file with a header and no row', () => {
		expect(rowCountProblemOf(tableOf('date,start time,end time\n\n'))).toEqual({ code: 'noRows' });
	});

	it('refuses a file over the row limit and tells how many rows it has', () => {
		const line = '2026-11-03,09:00,10:00';
		const atLimit = Array.from({ length: TIME_IMPORT_MAX_ROWS }, () => line).join('\n');
		const overLimit = `${atLimit}\n${line}`;

		expect(rowCountProblemOf(tableOf(`date,start time,end time\n${atLimit}\n`))).toBeNull();
		expect(rowCountProblemOf(tableOf(`date,start time,end time\n${overLimit}\n`))).toEqual({
			code: 'tooManyRows',
			count: TIME_IMPORT_MAX_ROWS + 1
		});
	});
});
