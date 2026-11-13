import { localDayKeyOf, type CsvColumn } from '@/core/lib/utils/dashboard-export';
import {
	DATE_ORDERS,
	calendarDayOf,
	datePartOf,
	holdsDateAndTime,
	type DateOrder
} from '@/core/lib/utils/time-import-cells';
import {
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_REPORT_HEADERS,
	timeImportTemplateColumnsOf,
	type TimeImportCells,
	type TimeImportColumn
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

function isSameDayIn(order: DateOrder, first: string, second: string): boolean {
	const firstDay = calendarDayOf(first, order);
	const secondDay = calendarDayOf(second, order);
	if (!firstDay || !secondDay) {
		return false;
	}
	const isSameYear = firstDay.year === secondDay.year;
	const isSameMonth = firstDay.month === secondDay.month;
	const isSameDate = firstDay.day === secondDay.day;
	return isSameYear && isSameMonth && isSameDate;
}

/** The report does not know the file's date format: a file writes its dates one way, so one format that reads both as the same day is enough. */
function namesSameDay(endDate: string, endTime: string): boolean {
	const endDateText = datePartOf(endDate);
	const endTimeDateText = datePartOf(endTime);
	return DATE_ORDERS.some((order) => isSameDayIn(order, endDateText, endTimeDateText));
}

function repeatsEndDate(cells: TimeImportCells): boolean {
	if (holdsDateAndTime(cells.endTime)) {
		return namesSameDay(cells.endDate, cells.endTime);
	}
	return cells.endDate === cells.date;
}

/**
 * The template has no end date column: a file that gave one apart has its end date written before the end time, so
 * an entry that ends the next day still does once the report is imported again. An end date is left out only when
 * it repeats what the row already says: the day of an end time that holds its own date, or else the date, so a date
 * that cannot be read is not named a second time as an end time that cannot be read. An end date that disagrees
 * with its end time, or cannot be read, stays: the row is still left out once the report is imported again.
 */
function reportEndTimeOf(cells: TimeImportCells): string {
	const hasEndDate = cells.endDate !== '';
	const hasEndTime = cells.endTime !== '';
	const isRepeated = repeatsEndDate(cells);
	if (!hasEndDate || !hasEndTime || isRepeated) {
		return cells.endTime;
	}
	return `${cells.endDate} ${cells.endTime}`;
}

function reportCellOf(line: TimeImportReportLine, column: TimeImportColumn): string {
	if (column === 'endTime') {
		return reportEndTimeOf(line.cells);
	}
	return line.cells[column];
}

/**
 * The report keeps the columns of the import under their own headers, so its rows can be corrected and the file
 * imported again: the rows already saved are then left out as already recorded.
 */
export function timeImportReportCsvColumnsOf(includesMemberEmail: boolean): CsvColumn<TimeImportReportLine>[] {
	const columns = timeImportTemplateColumnsOf(includesMemberEmail);
	const cellColumns: CsvColumn<TimeImportReportLine>[] = columns.map((column) => ({
		header: TIME_IMPORT_HEADERS[column],
		valueOf: (line) => reportCellOf(line, column)
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
