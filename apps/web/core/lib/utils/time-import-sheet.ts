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

/** A file read into its header and its lines, before anything says which column holds what. */
export interface TimeImportTable {
	/** Trimmed, in the order of the file. */
	headers: ReadonlyArray<string>;
	/** Every line under the header that is not blank. */
	records: ReadonlyArray<TimeImportRecord>;
}

type TimeImportTableResult =
	| { table: TimeImportTable; problem: null }
	| { table: null; problem: TimeImportSheetProblem };

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
