const BYTE_ORDER_MARK = '﻿';
const QUOTE = '"';
const COMMA = ',';
const SEMICOLON = ';';
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';

type CsvDelimiter = typeof COMMA | typeof SEMICOLON;

interface ParsedCsv {
	delimiter: CsvDelimiter;
	/** Every record of the file in order, blank lines included, so a record's position is its row in a spreadsheet. */
	records: string[][];
	/** The record, counted from 1, where a quoted cell opens and is never closed; null when every quote is closed. */
	unclosedQuoteRecord: number | null;
}

interface Scan {
	records: string[][];
	record: string[];
	cell: string;
	isInsideQuotes: boolean;
	isRecordStarted: boolean;
	quoteOpenedInRecord: number;
}

function withoutByteOrderMark(text: string): string {
	if (text.startsWith(BYTE_ORDER_MARK)) {
		return text.slice(BYTE_ORDER_MARK.length);
	}
	return text;
}

function isLineBreak(char: string): boolean {
	return char === LINE_FEED || char === CARRIAGE_RETURN;
}

/**
 * Spreadsheet apps write `;` between cells where the comma is the decimal mark. The header line tells which one the
 * file uses: the separator that appears most often outside its quoted cells, the comma when neither leads.
 */
function delimiterOf(content: string): CsvDelimiter {
	let commaCount = 0;
	let semicolonCount = 0;
	let isInsideQuotes = false;
	for (const char of content) {
		if (char === QUOTE) {
			isInsideQuotes = !isInsideQuotes;
			continue;
		}
		if (isInsideQuotes) {
			continue;
		}
		if (isLineBreak(char)) {
			break;
		}
		if (char === COMMA) {
			commaCount += 1;
		}
		if (char === SEMICOLON) {
			semicolonCount += 1;
		}
	}
	if (semicolonCount > commaCount) {
		return SEMICOLON;
	}
	return COMMA;
}

function closeCell(scan: Scan) {
	scan.record.push(scan.cell);
	scan.cell = '';
}

function closeRecord(scan: Scan) {
	closeCell(scan);
	scan.records.push(scan.record);
	scan.record = [];
	scan.isRecordStarted = false;
}

/** Reads one character inside a quoted cell and returns how many characters it took. */
function readQuoted(scan: Scan, char: string, nextChar: string | undefined): number {
	const isEscapedQuote = char === QUOTE && nextChar === QUOTE;
	if (isEscapedQuote) {
		scan.cell += QUOTE;
		return 2;
	}
	if (char === QUOTE) {
		scan.isInsideQuotes = false;
		return 1;
	}
	scan.cell += char;
	return 1;
}

/** Reads one character outside quotes and returns how many characters it took. */
function readPlain(scan: Scan, char: string, nextChar: string | undefined, delimiter: CsvDelimiter): number {
	const opensQuotedCell = char === QUOTE && scan.cell === '';
	if (opensQuotedCell) {
		scan.isInsideQuotes = true;
		scan.isRecordStarted = true;
		scan.quoteOpenedInRecord = scan.records.length + 1;
		return 1;
	}
	if (char === delimiter) {
		closeCell(scan);
		scan.isRecordStarted = true;
		return 1;
	}
	if (isLineBreak(char)) {
		closeRecord(scan);
		const isWindowsLineBreak = char === CARRIAGE_RETURN && nextChar === LINE_FEED;
		if (isWindowsLineBreak) {
			return 2;
		}
		return 1;
	}
	scan.cell += char;
	scan.isRecordStarted = true;
	return 1;
}

/**
 * Reads CSV text into records of cells: cells in double quotes may hold the separator, line breaks and doubled
 * quotes (`""` is one quote), a leading byte order mark is dropped, and lines end with LF, CRLF or CR. The
 * separator is `,` or `;`, read from the header line. Nothing is interpreted: every cell stays text.
 */
export function parseCsv(text: string): ParsedCsv {
	const content = withoutByteOrderMark(text);
	const delimiter = delimiterOf(content);
	const scan: Scan = {
		records: [],
		record: [],
		cell: '',
		isInsideQuotes: false,
		isRecordStarted: false,
		quoteOpenedInRecord: 0
	};
	let index = 0;
	while (index < content.length) {
		const char = content[index];
		const nextChar = content[index + 1];
		if (scan.isInsideQuotes) {
			index += readQuoted(scan, char, nextChar);
			continue;
		}
		index += readPlain(scan, char, nextChar, delimiter);
	}
	let unclosedQuoteRecord: number | null = null;
	if (scan.isInsideQuotes) {
		unclosedQuoteRecord = scan.quoteOpenedInRecord;
	}
	// A file that ends with a line break has no record after it
	if (scan.isRecordStarted) {
		closeRecord(scan);
	}
	return { delimiter, records: scan.records, unclosedQuoteRecord };
}
