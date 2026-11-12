import { parseCsv } from './csv-parse';

describe('parseCsv', () => {
	it('reads comma-separated lines into records of cells', () => {
		const parsed = parseCsv('date,start time,notes\n2026-11-03,09:00,Standup\n');

		expect(parsed.delimiter).toBe(',');
		expect(parsed.records).toEqual([
			['date', 'start time', 'notes'],
			['2026-11-03', '09:00', 'Standup']
		]);
		expect(parsed.unclosedQuoteRecord).toBeNull();
	});

	it('keeps the separator inside a quoted cell', () => {
		const parsed = parseCsv('task,notes\n"Fix login, again","a;b"\n');

		expect(parsed.records[1]).toEqual(['Fix login, again', 'a;b']);
	});

	it('reads a doubled quote inside a quoted cell as one quote', () => {
		const parsed = parseCsv('notes\n"She said ""ship it"""\n""""\n');

		expect(parsed.records[1]).toEqual(['She said "ship it"']);
		expect(parsed.records[2]).toEqual(['"']);
	});

	it('keeps line breaks inside a quoted cell, and counts the cell as one record', () => {
		const parsed = parseCsv('date,notes\r\n2026-11-03,"line one\r\nline two\nline three"\r\n2026-11-04,next\r\n');

		expect(parsed.records).toEqual([
			['date', 'notes'],
			['2026-11-03', 'line one\r\nline two\nline three'],
			['2026-11-04', 'next']
		]);
	});

	it('drops a leading byte order mark', () => {
		const parsed = parseCsv('﻿date,notes\n2026-11-03,x');

		expect(parsed.records[0]).toEqual(['date', 'notes']);
	});

	it('reads a semicolon-separated file, where commas stay in their cells', () => {
		const parsed = parseCsv('date;duration;notes\n2026-11-03;1,5;Review, then merge\n');

		expect(parsed.delimiter).toBe(';');
		expect(parsed.records[1]).toEqual(['2026-11-03', '1,5', 'Review, then merge']);
	});

	it('counts separators outside quoted cells only when it picks the separator', () => {
		const parsed = parseCsv('"a;b;c;d",date,notes\n1,2,3\n');

		expect(parsed.delimiter).toBe(',');
		expect(parsed.records[0]).toEqual(['a;b;c;d', 'date', 'notes']);
	});

	it('takes the comma when the header has a single column', () => {
		const parsed = parseCsv('date\n2026-11-03\n');

		expect(parsed.delimiter).toBe(',');
		expect(parsed.records).toEqual([['date'], ['2026-11-03']]);
	});

	it.each([
		['LF', 'a,b\nc,d\n'],
		['CRLF', 'a,b\r\nc,d\r\n'],
		['CR', 'a,b\rc,d\r']
	])('reads %s line endings', (_name, text) => {
		expect(parseCsv(text).records).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('reads the last line whether or not the file ends with a line break', () => {
		expect(parseCsv('a,b\nc,d').records).toHaveLength(2);
		expect(parseCsv('a,b\nc,d\n').records).toHaveLength(2);
	});

	it('keeps blank lines as records, so a record keeps its row number', () => {
		const parsed = parseCsv('date\n\n2026-11-03\n');

		expect(parsed.records).toEqual([['date'], [''], ['2026-11-03']]);
	});

	it('keeps empty cells, at the end of a line too', () => {
		const parsed = parseCsv('a,b,c\n1,,\n,,3\n');

		expect(parsed.records[1]).toEqual(['1', '', '']);
		expect(parsed.records[2]).toEqual(['', '', '3']);
	});

	it('reads a quote in the middle of an unquoted cell as text', () => {
		const parsed = parseCsv('notes\n5" nails,x\n');

		expect(parsed.records[1]).toEqual(['5" nails', 'x']);
	});

	it('tells where a quoted cell opens and never closes', () => {
		const parsed = parseCsv('date,notes\n2026-11-03,ok\n2026-11-04,"never closed\n2026-11-05,x\n');

		expect(parsed.unclosedQuoteRecord).toBe(3);
	});

	it('interprets nothing: a cell that looks like a formula or markup stays text', () => {
		const parsed = parseCsv('notes\n=HYPERLINK("http://x")\n<img src=x onerror=alert(1)>\n');

		expect(parsed.records[1]).toEqual(['=HYPERLINK("http://x")']);
		expect(parsed.records[2]).toEqual(['<img src=x onerror=alert(1)>']);
	});

	it('returns no record for an empty text', () => {
		expect(parseCsv('').records).toEqual([]);
		expect(parseCsv('﻿').records).toEqual([]);
	});
});
