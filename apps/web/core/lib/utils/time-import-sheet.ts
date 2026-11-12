import { parseCsv } from '@/core/lib/utils/csv-parse';
import type { DateOrder } from '@/core/lib/utils/time-import-cells';

export const TIME_IMPORT_MAX_BYTES = 1024 * 1024;

export const TIME_IMPORT_MAX_ROWS = 500;

const CSV_EXTENSION = '.csv';

export const TIME_IMPORT_COLUMNS = [
	'date',
	'startTime',
	'endTime',
	'duration',
	'project',
	'task',
	'notes',
	'billable',
	'memberEmail'
] as const;

export type TimeImportColumn = (typeof TIME_IMPORT_COLUMNS)[number];

/**
 * The header of each column, as the template writes it. A file's own headers match letter case aside, with spaces,
 * underscores or hyphens between the words. They are the same in every language, so a file made by one member can
 * be imported by another.
 */
export const TIME_IMPORT_HEADERS: Readonly<Record<TimeImportColumn, string>> = {
	date: 'date',
	startTime: 'start time',
	endTime: 'end time',
	duration: 'duration',
	project: 'project',
	task: 'task',
	notes: 'notes',
	billable: 'billable',
	memberEmail: 'member email'
};

/** The columns the import's own report adds, so a corrected report can be imported as it is. */
export const TIME_IMPORT_REPORT_HEADERS = { row: 'row', status: 'status', reason: 'reason' } as const;

export const REPORT_ONLY_HEADERS: ReadonlySet<string> = new Set(Object.values(TIME_IMPORT_REPORT_HEADERS));

const COLUMN_BY_HEADER: ReadonlyMap<string, TimeImportColumn> = new Map(
	TIME_IMPORT_COLUMNS.map((column) => [TIME_IMPORT_HEADERS[column], column])
);

/**
 * What the import reads from a row: the columns of the template, and the day an entry ends, which a file from
 * another tool may give in a column of its own.
 */
export type TimeImportField = TimeImportColumn | 'endDate';

export const TIME_IMPORT_FIELDS: ReadonlyArray<TimeImportField> = [
	'date',
	'startTime',
	'endDate',
	'endTime',
	'duration',
	'project',
	'task',
	'notes',
	'billable',
	'memberEmail'
];

export type TimeImportCells = Readonly<Record<TimeImportField, string>>;

/** For each field, the position of the file's column it is read from, or null when the file has none. */
export type TimeImportMapping = Readonly<Record<TimeImportField, number | null>>;

export const NO_TIME_IMPORT_COLUMNS: TimeImportMapping = {
	date: null,
	startTime: null,
	endDate: null,
	endTime: null,
	duration: null,
	project: null,
	task: null,
	notes: null,
	billable: null,
	memberEmail: null
};

/** The columns a file is read through, and the format of its dates when its own dates do not tell it. */
export interface TimeImportColumnsChoice {
	mapping: TimeImportMapping;
	dateOrder: DateOrder | null;
}

export interface TimeImportSheetRow {
	/** The row's position in the file, as a spreadsheet numbers it: the header is row 1. */
	row: number;
	cells: TimeImportCells;
	/** Filled cells past the last header: a separator typed in an unquoted cell shifts every cell after it. */
	extraCellCount: number;
}

export type TimeImportMissingColumn = 'date' | 'startTime' | 'endOrDuration';

export type TimeImportSheetProblem =
	| { code: 'empty' }
	| { code: 'unclosedQuote'; row: number }
	| { code: 'duplicateColumn'; header: string }
	| { code: 'missingColumns'; columns: TimeImportMissingColumn[] }
	| { code: 'noRows' }
	| { code: 'tooManyRows'; count: number }
	| { code: 'mixedDates'; firstRow: number; firstValue: string; row: number; value: string };

export type TimeImportFileProblem =
	| { code: 'notCsv' }
	| { code: 'tooLarge' }
	| { code: 'notText' }
	| TimeImportSheetProblem;

export interface TimeImportSheet {
	rows: TimeImportSheetRow[];
	/** The headers of the file the import does not read, as typed. */
	ignoredHeaders: string[];
	dateOrder: DateOrder;
}

export interface TimeImportRecord {
	/** The line's position in the file, as a spreadsheet numbers it: the header is row 1. */
	row: number;
	cells: ReadonlyArray<string>;
}

export interface TimeImportTable {
	/** Trimmed, in the order of the file. */
	headers: ReadonlyArray<string>;
	/** Every line under the header that is not blank. */
	records: ReadonlyArray<TimeImportRecord>;
}

type TimeImportTableResult =
	| { table: TimeImportTable; problem: null }
	| { table: null; problem: TimeImportSheetProblem };

type TimeImportSheetResult =
	| { sheet: TimeImportSheet; problem: null }
	| { sheet: null; problem: TimeImportSheetProblem };

/** Refuses a file before it is read: only `.csv`, and no larger than the limit stated on screen. */
export function timeImportFileRefusalOf(fileName: string, byteSize: number): TimeImportFileProblem | null {
	const hasCsvExtension = fileName.toLowerCase().endsWith(CSV_EXTENSION);
	if (!hasCsvExtension) {
		return { code: 'notCsv' };
	}
	if (byteSize > TIME_IMPORT_MAX_BYTES) {
		return { code: 'tooLarge' };
	}
	return null;
}

/** The columns of the template. The member's email is only read for a viewer who may add time for someone else. */
export function timeImportTemplateColumnsOf(includesMemberEmail: boolean): TimeImportColumn[] {
	if (includesMemberEmail) {
		return [...TIME_IMPORT_COLUMNS];
	}
	return TIME_IMPORT_COLUMNS.filter((column) => column !== 'memberEmail');
}

function isBlankRecord(record: ReadonlyArray<string>): boolean {
	return record.every((cell) => cell.trim() === '');
}

/**
 * Reads the text of a CSV file into its header and its lines: the first line that is not blank is the header, and
 * every other line that is not blank is a row. A file without a header, or with a quote never closed, is refused.
 */
export function timeImportTableOf(text: string): TimeImportTableResult {
	const { records, unclosedQuoteRecord } = parseCsv(text);
	if (unclosedQuoteRecord !== null) {
		return { table: null, problem: { code: 'unclosedQuote', row: unclosedQuoteRecord } };
	}
	const headerIndex = records.findIndex((record) => !isBlankRecord(record));
	if (headerIndex === -1) {
		return { table: null, problem: { code: 'empty' } };
	}
	const headers = records[headerIndex].map((header) => header.trim());
	const dataRecords: TimeImportRecord[] = [];
	records.forEach((record, recordIndex) => {
		const isAfterHeader = recordIndex > headerIndex;
		if (!isAfterHeader || isBlankRecord(record)) {
			return;
		}
		dataRecords.push({ row: recordIndex + 1, cells: record });
	});
	return { table: { headers, records: dataRecords }, problem: null };
}

/** A file with no row, or with more rows than an import takes, is refused whatever its columns. */
export function rowCountProblemOf(table: TimeImportTable): TimeImportSheetProblem | null {
	const count = table.records.length;
	if (count === 0) {
		return { code: 'noRows' };
	}
	if (count > TIME_IMPORT_MAX_ROWS) {
		return { code: 'tooManyRows', count };
	}
	return null;
}

/**
 * A header as plain lower-case words, letter case, spaces, underscores, hyphens and punctuation aside:
 * `START_TIME`, `startTime` and `Start-Time` read as `start time`, `Duration (h)` as `duration h`.
 */
export function headerWordsOf(header: string): string {
	const spaced = header.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
	const lowered = spaced.normalize('NFC').toLowerCase();
	const words = lowered.replace(/[^\p{L}\p{N}]+/gu, ' ');
	return words.trim();
}

export function missingColumnsOf(mapping: TimeImportMapping): TimeImportMissingColumn[] {
	const missing: TimeImportMissingColumn[] = [];
	if (mapping.date === null) {
		missing.push('date');
	}
	if (mapping.startTime === null) {
		missing.push('startTime');
	}
	const hasEndColumn = mapping.endTime !== null || mapping.duration !== null;
	if (!hasEndColumn) {
		missing.push('endOrDuration');
	}
	return missing;
}

function cellAt(record: ReadonlyArray<string>, index: number | null): string {
	if (index === null) {
		return '';
	}
	const cell = record[index] ?? '';
	return cell.trim();
}

function cellsOf(record: ReadonlyArray<string>, mapping: TimeImportMapping): TimeImportCells {
	const cellOf = (field: TimeImportField) => cellAt(record, mapping[field]);
	return {
		date: cellOf('date'),
		startTime: cellOf('startTime'),
		endDate: cellOf('endDate'),
		endTime: cellOf('endTime'),
		duration: cellOf('duration'),
		project: cellOf('project'),
		task: cellOf('task'),
		notes: cellOf('notes'),
		billable: cellOf('billable'),
		memberEmail: cellOf('memberEmail')
	};
}

function extraCellCountOf(record: ReadonlyArray<string>, headerCount: number): number {
	const extraCells = record.slice(headerCount);
	return extraCells.filter((cell) => cell.trim() !== '').length;
}

/** The headers of the file no field is read from. The import's own report columns and blank headers are not named. */
export function ignoredHeadersOf(headers: ReadonlyArray<string>, mapping: TimeImportMapping): string[] {
	const readIndexes = new Set(Object.values(mapping));
	const ignored: string[] = [];
	headers.forEach((header, index) => {
		const words = headerWordsOf(header);
		const isNamed = words !== '';
		const isReportColumn = REPORT_ONLY_HEADERS.has(words);
		const isRead = readIndexes.has(index);
		if (isNamed && !isReportColumn && !isRead) {
			ignored.push(header);
		}
	});
	return ignored;
}

export function timeImportSheetOfTable(
	table: TimeImportTable,
	mapping: TimeImportMapping,
	dateOrder: DateOrder
): TimeImportSheet {
	const headerCount = table.headers.length;
	const rows: TimeImportSheetRow[] = table.records.map((record) => ({
		row: record.row,
		cells: cellsOf(record.cells, mapping),
		extraCellCount: extraCellCountOf(record.cells, headerCount)
	}));
	return { rows, ignoredHeaders: ignoredHeadersOf(table.headers, mapping), dateOrder };
}

interface TemplateColumnsReading {
	mapping: Record<TimeImportField, number | null>;
	duplicateHeader: string | null;
}

function templateColumnsOf(headers: ReadonlyArray<string>): TemplateColumnsReading {
	const reading: TemplateColumnsReading = { mapping: { ...NO_TIME_IMPORT_COLUMNS }, duplicateHeader: null };
	headers.forEach((header, index) => {
		const words = headerWordsOf(header);
		const column = COLUMN_BY_HEADER.get(words);
		if (!column) {
			return;
		}
		const isRepeated = reading.mapping[column] !== null;
		if (isRepeated) {
			reading.duplicateHeader ??= TIME_IMPORT_HEADERS[column];
			return;
		}
		reading.mapping[column] = index;
	});
	return reading;
}

/**
 * Reads the text of a CSV file the way the template is read: the template's own headers name the columns, in any
 * order, every other column is left out, and dates are written year first. A file the import cannot use at all is
 * refused whole, with the reason; what each row holds is judged later, row by row.
 */
export function timeImportSheetOf(text: string): TimeImportSheetResult {
	const tableReading = timeImportTableOf(text);
	if (!tableReading.table) {
		return { sheet: null, problem: tableReading.problem };
	}
	const { table } = tableReading;
	const columns = templateColumnsOf(table.headers);
	if (columns.duplicateHeader) {
		return { sheet: null, problem: { code: 'duplicateColumn', header: columns.duplicateHeader } };
	}
	const missingColumns = missingColumnsOf(columns.mapping);
	if (missingColumns.length > 0) {
		return { sheet: null, problem: { code: 'missingColumns', columns: missingColumns } };
	}
	const countProblem = rowCountProblemOf(table);
	if (countProblem) {
		return { sheet: null, problem: countProblem };
	}
	const sheet = timeImportSheetOfTable(table, columns.mapping, 'yearFirst');
	return { sheet, problem: null };
}
