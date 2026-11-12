import { localDayKeyOf, type CsvColumn } from '@/core/lib/utils/dashboard-export';
import {
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_REPORT_HEADERS,
	timeImportTemplateColumnsOf,
	type TimeImportCells
} from '@/core/lib/utils/time-import-sheet';

export const TIME_IMPORT_TEMPLATE_FILE_NAME = 'time-import-template.csv';

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

/**
 * The report keeps the columns of the import under their own headers, so its rows can be corrected and the file
 * imported again: the rows already saved are then left out as already recorded.
 */
export function timeImportReportCsvColumnsOf(includesMemberEmail: boolean): CsvColumn<TimeImportReportLine>[] {
	const columns = timeImportTemplateColumnsOf(includesMemberEmail);
	const cellColumns: CsvColumn<TimeImportReportLine>[] = columns.map((column) => ({
		header: TIME_IMPORT_HEADERS[column],
		valueOf: (line) => line.cells[column]
	}));
	return [
		{ header: TIME_IMPORT_REPORT_HEADERS.row, valueOf: (line) => line.row },
		...cellColumns,
		{ header: TIME_IMPORT_REPORT_HEADERS.status, valueOf: (line) => line.status },
		{ header: TIME_IMPORT_REPORT_HEADERS.reason, valueOf: (line) => line.reason }
	];
}

/** `time-import-report-2026-11-12.csv`, from the local day the import ran. */
export function timeImportReportFileNameOf(day: Date): string {
	return `time-import-report-${localDayKeyOf(day)}.csv`;
}
