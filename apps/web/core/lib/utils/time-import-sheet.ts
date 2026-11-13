import { parseCsv } from '@/core/lib/utils/csv-parse';

export const TIME_IMPORT_MAX_BYTES = 1024 * 1024;

export const TIME_IMPORT_MAX_ROWS = 500;

const CSV_EXTENSION = '.csv';

const TIME_IMPORT_COLUMNS = [
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

const REPORT_ONLY_HEADERS: ReadonlySet<string> = new Set(Object.values(TIME_IMPORT_REPORT_HEADERS));

const COLUMN_BY_HEADER: ReadonlyMap<string, TimeImportColumn> = new Map(
	TIME_IMPORT_COLUMNS.map((column) => [TIME_IMPORT_HEADERS[column], column])
);

export type TimeImportCells = Readonly<Record<TimeImportColumn, string>>;

export interface TimeImportSheetRow {
	/** The row's position in the file, as a spreadsheet numbers it: the header is row 1. */
	row: number;
	cells: TimeImportCells;
	/** Filled cells past the last header: a separator typed in an unquoted cell shifts every cell after it. */
	extraCellCount: number;
}

export type TimeImportMissingColumn = 'date' | 'startTime' | 'endOrDuration';

type TimeImportSheetProblem =
	| { code: 'empty' }
	| { code: 'unclosedQuote'; row: number }
	| { code: 'duplicateColumn'; header: string }
	| { code: 'missingColumns'; columns: TimeImportMissingColumn[] }
	| { code: 'noRows' }
	| { code: 'tooManyRows'; count: number };

export type TimeImportFileProblem =
	| { code: 'notCsv' }
	| { code: 'tooLarge' }
	| { code: 'notText' }
	| TimeImportSheetProblem;

export interface TimeImportSheet {
	rows: TimeImportSheetRow[];
	/** The headers of the file the import does not read, as typed. */
	ignoredHeaders: string[];
}

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

function normalizedHeaderOf(header: string): string {
	const lowered = header.trim().toLowerCase();
	return lowered.replace(/[\s_-]+/g, ' ');
}

function isBlankRecord(record: ReadonlyArray<string>): boolean {
	return record.every((cell) => cell.trim() === '');
}

interface HeaderReading {
	indexByColumn: Map<TimeImportColumn, number>;
	ignoredHeaders: string[];
	duplicateHeader: string | null;
	cellCount: number;
}

function readHeader(record: ReadonlyArray<string>): HeaderReading {
	const reading: HeaderReading = {
		indexByColumn: new Map(),
		ignoredHeaders: [],
		duplicateHeader: null,
		cellCount: record.length
	};
	record.forEach((typedHeader, index) => {
		const header = normalizedHeaderOf(typedHeader);
		const column = COLUMN_BY_HEADER.get(header);
		if (!column) {
			const isNamed = header !== '';
			const isReportColumn = REPORT_ONLY_HEADERS.has(header);
			if (isNamed && !isReportColumn) {
				reading.ignoredHeaders.push(typedHeader.trim());
			}
			return;
		}
		const isRepeated = reading.indexByColumn.has(column);
		if (isRepeated) {
			reading.duplicateHeader ??= TIME_IMPORT_HEADERS[column];
			return;
		}
		reading.indexByColumn.set(column, index);
	});
	return reading;
}

function missingColumnsOf(indexByColumn: ReadonlyMap<TimeImportColumn, number>): TimeImportMissingColumn[] {
	const missing: TimeImportMissingColumn[] = [];
	if (!indexByColumn.has('date')) {
		missing.push('date');
	}
	if (!indexByColumn.has('startTime')) {
		missing.push('startTime');
	}
	const hasEndColumn = indexByColumn.has('endTime') || indexByColumn.has('duration');
	if (!hasEndColumn) {
		missing.push('endOrDuration');
	}
	return missing;
}

function cellAt(record: ReadonlyArray<string>, index: number | undefined): string {
	if (index === undefined) {
		return '';
	}
	const cell = record[index] ?? '';
	return cell.trim();
}

function cellsOf(record: ReadonlyArray<string>, indexByColumn: ReadonlyMap<TimeImportColumn, number>): TimeImportCells {
	const cellOf = (column: TimeImportColumn) => cellAt(record, indexByColumn.get(column));
	return {
		date: cellOf('date'),
		startTime: cellOf('startTime'),
		endTime: cellOf('endTime'),
		duration: cellOf('duration'),
		project: cellOf('project'),
		task: cellOf('task'),
		notes: cellOf('notes'),
		billable: cellOf('billable'),
		memberEmail: cellOf('memberEmail')
	};
}

function extraCellCountOf(record: ReadonlyArray<string>, headerCellCount: number): number {
	const extraCells = record.slice(headerCellCount);
	return extraCells.filter((cell) => cell.trim() !== '').length;
}

/**
 * Reads the text of a CSV file into the rows of a time import: the header names the columns, in any order, and
 * every other line that is not blank is a row. A file the import cannot use at all is refused whole, with the
 * reason; what each row holds is judged later, row by row.
 */
export function timeImportSheetOf(text: string): TimeImportSheetResult {
	const { records, unclosedQuoteRecord } = parseCsv(text);
	if (unclosedQuoteRecord !== null) {
		return { sheet: null, problem: { code: 'unclosedQuote', row: unclosedQuoteRecord } };
	}
	const headerIndex = records.findIndex((record) => !isBlankRecord(record));
	if (headerIndex === -1) {
		return { sheet: null, problem: { code: 'empty' } };
	}
	const header = readHeader(records[headerIndex]);
	if (header.duplicateHeader) {
		return { sheet: null, problem: { code: 'duplicateColumn', header: header.duplicateHeader } };
	}
	const missingColumns = missingColumnsOf(header.indexByColumn);
	if (missingColumns.length > 0) {
		return { sheet: null, problem: { code: 'missingColumns', columns: missingColumns } };
	}
	const rows: TimeImportSheetRow[] = [];
	records.forEach((record, recordIndex) => {
		const isAfterHeader = recordIndex > headerIndex;
		if (!isAfterHeader || isBlankRecord(record)) {
			return;
		}
		rows.push({
			row: recordIndex + 1,
			cells: cellsOf(record, header.indexByColumn),
			extraCellCount: extraCellCountOf(record, header.cellCount)
		});
	});
	if (rows.length === 0) {
		return { sheet: null, problem: { code: 'noRows' } };
	}
	if (rows.length > TIME_IMPORT_MAX_ROWS) {
		return { sheet: null, problem: { code: 'tooManyRows', count: rows.length } };
	}
	return { sheet: { rows, ignoredHeaders: header.ignoredHeaders }, problem: null };
}
