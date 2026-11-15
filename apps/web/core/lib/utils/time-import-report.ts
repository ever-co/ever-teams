import { localDayKeyOf, type CsvColumn } from '@/core/lib/utils/dashboard-export';
import {
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_REPORT_HEADERS,
	timeImportTemplateColumnsOf,
	type TimeImportCells,
	type TimeImportColumn
} from '@/core/lib/utils/time-import-sheet';

export const TIME_IMPORT_TEMPLATE_FILE_NAME = 'time-import-template.csv';

const END_DATE_HEADER = 'end date';

export interface TimeImportReportLine {
	row: number;
	cells: TimeImportCells;
	status: string;
	reason: string;
}

/** The template is its header line alone: an example row could be imported as real time by mistake. */
export function timeImportTemplateCsvColumnsOf(includesMemberEmail: boolean): CsvColumn<never>[] {
	const columns = timeImportTemplateColumnsOf(includesMemberEmail);
	return columns.map((column) => ({ header: TIME_IMPORT_HEADERS[column], valueOf: () => '' }));
}

function cellColumnOf(column: TimeImportColumn): CsvColumn<TimeImportReportLine> {
	return { header: TIME_IMPORT_HEADERS[column], valueOf: (line) => line.cells[column] };
}

const END_DATE_COLUMN: CsvColumn<TimeImportReportLine> = {
	header: END_DATE_HEADER,
	valueOf: (line) => line.cells.endDate
};

function cellColumnsOf(includesMemberEmail: boolean, includesEndDate: boolean): CsvColumn<TimeImportReportLine>[] {
	const cellColumns: CsvColumn<TimeImportReportLine>[] = [];
	for (const column of timeImportTemplateColumnsOf(includesMemberEmail)) {
		const isEndTime = column === 'endTime';
		if (isEndTime && includesEndDate) {
			cellColumns.push(END_DATE_COLUMN);
		}
		cellColumns.push(cellColumnOf(column));
	}
	return cellColumns;
}

/**
 * The report keeps the columns of the import under their own headers, so its rows can be corrected and the file
 * imported again: the rows already saved are then left out as already recorded. An end date the file gave stays in a
 * column of its own, exactly as written, so a row left out for its end date is left out again; the column is dropped
 * only for a file that gave none.
 */
export function timeImportReportCsvColumnsOf(
	includesMemberEmail: boolean,
	includesEndDate = true
): CsvColumn<TimeImportReportLine>[] {
	return [
		{ header: TIME_IMPORT_REPORT_HEADERS.row, valueOf: (line) => line.row },
		...cellColumnsOf(includesMemberEmail, includesEndDate),
		{ header: TIME_IMPORT_REPORT_HEADERS.status, valueOf: (line) => line.status },
		{ header: TIME_IMPORT_REPORT_HEADERS.reason, valueOf: (line) => line.reason }
	];
}

/** `time-import-report-2026-11-12.csv`, from the local day the import ran. */
export function timeImportReportFileNameOf(day: Date): string {
	return `time-import-report-${localDayKeyOf(day)}.csv`;
}
