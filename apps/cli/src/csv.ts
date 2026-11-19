import { EntryRecord } from './entries.js';

/** The columns of an export, named and ordered as the keys of an entry in JSON. */
export const CSV_COLUMNS: Array<keyof EntryRecord> = [
	'id',
	'startedAt',
	'stoppedAt',
	'durationSeconds',
	'running',
	'projectId',
	'projectName',
	'taskId',
	'taskNumber',
	'taskTitle',
	'note',
	'logType',
	'billable',
	'memberId',
	'memberName'
];

// A spreadsheet runs a cell that starts with one of these as a formula: a note such as =HYPERLINK(...) typed by a
// member would run in the sheet that imports the export. Such a text gets a leading ' and stays text.
const FORMULA_START = /^[=+\-@\t\r]/;

const NEEDS_QUOTES = /[",\r\n]/;

function textCell(text: string): string {
	let cell = text;
	if (FORMULA_START.test(cell)) {
		cell = `'${cell}`;
	}
	if (!NEEDS_QUOTES.test(cell)) {
		return cell;
	}
	const escaped = cell.replaceAll('"', '""');
	return `"${escaped}"`;
}

function cellOf(value: EntryRecord[keyof EntryRecord]): string {
	if (value === null) {
		return '';
	}
	if (typeof value === 'string') {
		return textCell(value);
	}
	return String(value);
}

const rowOf = (record: EntryRecord): string => CSV_COLUMNS.map((column) => cellOf(record[column])).join(',');

/** The entries as CSV (RFC 4180): a header row, then one row per entry, every line ending with CRLF. */
export function csvOf(records: EntryRecord[]): string {
	const rows = [CSV_COLUMNS.join(','), ...records.map(rowOf)];
	return rows.map((row) => `${row}\r\n`).join('');
}
