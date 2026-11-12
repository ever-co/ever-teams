import type { DateOrder } from '@/core/lib/utils/time-import-cells';
import {
	TIME_IMPORT_COLUMNS,
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_REPORT_HEADERS,
	rowCountProblemOf,
	timeImportTableOf,
	type TimeImportCells,
	type TimeImportColumn,
	type TimeImportField,
	type TimeImportMapping,
	type TimeImportMissingColumn,
	type TimeImportSheet,
	type TimeImportSheetProblem,
	type TimeImportSheetRow,
	type TimeImportTable
} from '@/core/lib/utils/time-import-sheet';

const REPORT_ONLY_HEADERS: ReadonlySet<string> = new Set(Object.values(TIME_IMPORT_REPORT_HEADERS));

const COLUMN_BY_HEADER: ReadonlyMap<string, TimeImportColumn> = new Map(
	TIME_IMPORT_COLUMNS.map((column) => [TIME_IMPORT_HEADERS[column], column])
);

const NO_COLUMNS: TimeImportMapping = {
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

function normalizedHeaderOf(header: string): string {
	const lowered = header.trim().toLowerCase();
	return lowered.replace(/[\s_-]+/g, ' ');
}

interface HeaderReading {
	mapping: Record<TimeImportField, number | null>;
	duplicateHeader: string | null;
}

function readHeaders(headers: ReadonlyArray<string>): HeaderReading {
	const reading: HeaderReading = { mapping: { ...NO_COLUMNS }, duplicateHeader: null };
	headers.forEach((typedHeader, index) => {
		const column = COLUMN_BY_HEADER.get(normalizedHeaderOf(typedHeader));
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

function missingColumnsOf(mapping: TimeImportMapping): TimeImportMissingColumn[] {
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

/** The headers of the file no column of the import is read from. The import's own report columns are not named. */
function ignoredHeadersOf(headers: ReadonlyArray<string>, mapping: TimeImportMapping): string[] {
	const readIndexes = new Set(Object.values(mapping));
	const ignored: string[] = [];
	headers.forEach((header, index) => {
		const normalized = normalizedHeaderOf(header);
		const isNamed = normalized !== '';
		const isReportColumn = REPORT_ONLY_HEADERS.has(normalized);
		const isRead = readIndexes.has(index);
		if (isNamed && !isReportColumn && !isRead) {
			ignored.push(header);
		}
	});
	return ignored;
}

function timeImportSheetOf(table: TimeImportTable, mapping: TimeImportMapping, dateOrder: DateOrder): TimeImportSheet {
	const headerCount = table.headers.length;
	const rows: TimeImportSheetRow[] = table.records.map((record) => ({
		row: record.row,
		cells: cellsOf(record.cells, mapping),
		extraCellCount: extraCellCountOf(record.cells, headerCount)
	}));
	return { rows, ignoredHeaders: ignoredHeadersOf(table.headers, mapping), dateOrder };
}

export type TimeImportReading =
	| { kind: 'refused'; problem: TimeImportSheetProblem }
	| { kind: 'sheet'; sheet: TimeImportSheet };

/**
 * Reads the text of a CSV file into the rows of a time import: the header names the columns, in any order, and
 * every other line that is not blank is a row. A file the import cannot use at all is refused whole, with the
 * reason; what each row holds is judged later, row by row.
 */
export function timeImportReadingOf(text: string): TimeImportReading {
	const tableReading = timeImportTableOf(text);
	if (!tableReading.table) {
		return { kind: 'refused', problem: tableReading.problem };
	}
	const { table } = tableReading;
	const header = readHeaders(table.headers);
	if (header.duplicateHeader) {
		return { kind: 'refused', problem: { code: 'duplicateColumn', header: header.duplicateHeader } };
	}
	const missingColumns = missingColumnsOf(header.mapping);
	if (missingColumns.length > 0) {
		return { kind: 'refused', problem: { code: 'missingColumns', columns: missingColumns } };
	}
	const countProblem = rowCountProblemOf(table);
	if (countProblem) {
		return { kind: 'refused', problem: countProblem };
	}
	return { kind: 'sheet', sheet: timeImportSheetOf(table, header.mapping, 'yearFirst') };
}
