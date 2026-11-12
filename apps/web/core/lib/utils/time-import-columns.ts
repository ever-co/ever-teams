import { dateOrdersOf, datePartOf, holdsDateAndTime, type DateOrder } from '@/core/lib/utils/time-import-cells';
import {
	NO_TIME_IMPORT_COLUMNS,
	TIME_IMPORT_FIELDS,
	TIME_IMPORT_REPORT_HEADERS,
	rowCountProblemOf,
	timeImportTableOf,
	type TimeImportCells,
	type TimeImportColumnsChoice,
	type TimeImportField,
	type TimeImportMapping,
	type TimeImportMissingColumn,
	type TimeImportRecord,
	type TimeImportSheet,
	type TimeImportSheetProblem,
	type TimeImportSheetRow,
	type TimeImportTable
} from '@/core/lib/utils/time-import-sheet';

/**
 * The headers each field is read from, in the words of the template and of the usual time exports: a start date
 * and a start time in two columns, an end date and an end time, a description for the notes, a user or an email
 * for the member, a duration in hours and minutes or in decimal hours. A column of minutes is never recognised as
 * a duration, since the import reads a bare number as hours.
 */
const FIELD_HEADERS: Readonly<Record<TimeImportField, ReadonlyArray<string>>> = {
	date: ['date', 'day', 'start date', 'entry date', 'work date', 'date worked'],
	startTime: [
		'start time',
		'start',
		'from',
		'started',
		'started at',
		'start at',
		'begin',
		'time in',
		'clock in',
		'start date time',
		'start datetime'
	],
	endDate: ['end date', 'stop date', 'finish date'],
	endTime: [
		'end time',
		'end',
		'to',
		'until',
		'ended',
		'ended at',
		'end at',
		'stop',
		'stopped at',
		'stop time',
		'finish',
		'finish time',
		'time out',
		'clock out',
		'end date time',
		'end datetime'
	],
	duration: [
		'duration',
		'hours',
		'duration h',
		'duration hours',
		'duration decimal',
		'duration hh mm',
		'duration hh mm ss',
		'decimal hours',
		'hours decimal',
		'time h',
		'time decimal',
		'hours worked',
		'worked hours',
		'total hours'
	],
	project: ['project', 'project name'],
	task: ['task', 'task name', 'task title'],
	notes: ['notes', 'note', 'description', 'comment', 'comments', 'memo', 'details'],
	billable: ['billable', 'is billable'],
	memberEmail: [
		'member email',
		'email',
		'e mail',
		'email address',
		'user email',
		'employee email',
		'user',
		'member',
		'employee',
		'team member'
	]
};

const REPORT_ONLY_HEADERS: ReadonlySet<string> = new Set(Object.values(TIME_IMPORT_REPORT_HEADERS));

function fieldByHeaderOf(): Map<string, TimeImportField> {
	const fieldByHeader = new Map<string, TimeImportField>();
	for (const field of TIME_IMPORT_FIELDS) {
		for (const header of FIELD_HEADERS[field]) {
			fieldByHeader.set(header, field);
		}
	}
	return fieldByHeader;
}

const FIELD_BY_HEADER: ReadonlyMap<string, TimeImportField> = fieldByHeaderOf();

/** The fields whose cells can hold a date: the date and the end date, and a start or an end written with its date. */
const DATE_FIELDS: ReadonlyArray<TimeImportField> = ['date', 'startTime', 'endDate', 'endTime'];

/**
 * A header as plain lower-case words, letter case, spaces, underscores, hyphens and punctuation aside:
 * `START_TIME`, `startTime` and `Start-Time` read as `start time`, `Duration (h)` as `duration h`.
 */
function headerWordsOf(header: string): string {
	const spaced = header.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
	const lowered = spaced.normalize('NFC').toLowerCase();
	const words = lowered.replace(/[^\p{L}\p{N}]+/gu, ' ');
	return words.trim();
}

interface HeaderReading {
	mapping: Record<TimeImportField, number | null>;
	/** The words of the first header the file repeats for a field it reads, if any. */
	duplicateHeader: string | null;
}

function readHeaders(headers: ReadonlyArray<string>): HeaderReading {
	const reading: HeaderReading = { mapping: { ...NO_TIME_IMPORT_COLUMNS }, duplicateHeader: null };
	const wordsByField = new Map<TimeImportField, string>();
	headers.forEach((header, index) => {
		const words = headerWordsOf(header);
		const field = FIELD_BY_HEADER.get(words);
		if (!field) {
			return;
		}
		const heldBy = wordsByField.get(field);
		if (heldBy === undefined) {
			reading.mapping[field] = index;
			wordsByField.set(field, words);
			return;
		}
		if (heldBy === words) {
			reading.duplicateHeader ??= words;
		}
	});
	return reading;
}

function firstValueOf(table: TimeImportTable, columnIndex: number | null): string | null {
	if (columnIndex === null) {
		return null;
	}
	for (const record of table.records) {
		const cell = record.cells[columnIndex] ?? '';
		const value = cell.trim();
		if (value !== '') {
			return value;
		}
	}
	return null;
}

function holdsDatesAndTimes(table: TimeImportTable, columnIndex: number | null): boolean {
	const value = firstValueOf(table, columnIndex);
	if (value === null) {
		return false;
	}
	return holdsDateAndTime(value);
}

/** A start or an end column that holds a date and a time gives the date of its moment too. */
function withDatesOfMoments(table: TimeImportTable, mapping: TimeImportMapping): TimeImportMapping {
	const withDates: Record<TimeImportField, number | null> = { ...mapping };
	const lacksDate = mapping.date === null;
	if (lacksDate && holdsDatesAndTimes(table, mapping.startTime)) {
		withDates.date = mapping.startTime;
	}
	const lacksEndDate = mapping.endDate === null;
	if (lacksEndDate && holdsDatesAndTimes(table, mapping.endTime)) {
		withDates.endDate = mapping.endTime;
	}
	return withDates;
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

/** How the dates of a file are written, as its own values tell. */
export type DateOrderReading =
	| { kind: 'none' }
	| { kind: 'told'; order: DateOrder; row: number; value: string }
	| { kind: 'ambiguous'; row: number; value: string }
	| { kind: 'mixed'; firstRow: number; firstValue: string; row: number; value: string };

interface DatedValue {
	row: number;
	value: string;
}

function dateColumnsOf(mapping: TimeImportMapping): number[] {
	const columns = new Set<number>();
	for (const field of DATE_FIELDS) {
		const columnIndex = mapping[field];
		if (columnIndex !== null) {
			columns.add(columnIndex);
		}
	}
	return [...columns];
}

function datedValuesOf(table: TimeImportTable, mapping: TimeImportMapping): DatedValue[] {
	const columns = dateColumnsOf(mapping);
	const values: DatedValue[] = [];
	for (const record of table.records) {
		for (const columnIndex of columns) {
			const cell = record.cells[columnIndex] ?? '';
			const value = datePartOf(cell);
			if (value !== '') {
				values.push({ row: record.row, value });
			}
		}
	}
	return values;
}

/**
 * Tells how the dates of a file are written from its values: a year written first, a day above 12 or a second
 * number above 12 settles it. Dates that fit both a day first and a month first settle nothing, and a file whose
 * values settle two different orders mixes them, from the first row that contradicts an earlier one.
 */
export function dateOrderReadingOf(table: TimeImportTable, mapping: TimeImportMapping): DateOrderReading {
	let told: (DatedValue & { order: DateOrder }) | null = null;
	let ambiguous: DatedValue | null = null;
	for (const dated of datedValuesOf(table, mapping)) {
		const orders = dateOrdersOf(dated.value);
		const isAmbiguous = orders.length > 1;
		if (isAmbiguous) {
			ambiguous ??= dated;
			continue;
		}
		const [order] = orders;
		if (!order) {
			continue;
		}
		if (!told) {
			told = { ...dated, order };
			continue;
		}
		if (told.order !== order) {
			return { kind: 'mixed', firstRow: told.row, firstValue: told.value, row: dated.row, value: dated.value };
		}
	}
	if (told) {
		return { kind: 'told', ...told };
	}
	if (ambiguous) {
		return { kind: 'ambiguous', ...ambiguous };
	}
	return { kind: 'none' };
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
function ignoredHeadersOf(headers: ReadonlyArray<string>, mapping: TimeImportMapping): string[] {
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

export function timeImportSheetOf(
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

const CHOSEN_ORDERS: ReadonlyArray<DateOrder> = ['dayFirst', 'monthFirst'];

/**
 * The format the rows are read in: the one the file's dates tell, the template's when it writes no date, or the
 * member's choice between day first and month first when every date fits both. Null while nothing settles it.
 */
export function resolvedDateOrderOf(dates: DateOrderReading, chosen: DateOrder | null): DateOrder | null {
	if (dates.kind === 'none') {
		return 'yearFirst';
	}
	if (dates.kind === 'told') {
		return dates.order;
	}
	if (dates.kind === 'mixed') {
		return null;
	}
	const isFittingChoice = chosen !== null && CHOSEN_ORDERS.includes(chosen);
	if (!isFittingChoice) {
		return null;
	}
	return chosen;
}

/** The rows of the file shown under the Columns step, so the member sees what each column holds. */
const FIRST_ROWS_SHOWN = 3;

export type TimeImportColumnsBlocker = 'missing' | 'mixedDates' | 'dateOrder';

export interface TimeImportColumnsStepField {
	field: TimeImportField;
	columnIndex: number | null;
	/** The first value the chosen column holds. */
	sample: string | null;
}

export interface TimeImportColumnsStep {
	headers: ReadonlyArray<string>;
	fields: TimeImportColumnsStepField[];
	dates: DateOrderReading;
	dateOrder: DateOrder | null;
	missing: TimeImportMissingColumn[];
	leftOutHeaders: string[];
	/** The first reason the rows cannot be checked yet, or null when they can. */
	blocker: TimeImportColumnsBlocker | null;
	firstRows: ReadonlyArray<TimeImportRecord>;
	rowCount: number;
}

function blockerOf(
	missing: ReadonlyArray<TimeImportMissingColumn>,
	dates: DateOrderReading,
	dateOrder: DateOrder | null
): TimeImportColumnsBlocker | null {
	if (missing.length > 0) {
		return 'missing';
	}
	if (dates.kind === 'mixed') {
		return 'mixedDates';
	}
	if (dateOrder === null) {
		return 'dateOrder';
	}
	return null;
}

/** What the Columns step shows for a file and a choice of columns, and whether its rows can be checked. */
export function timeImportColumnsStepOf(
	table: TimeImportTable,
	choice: TimeImportColumnsChoice
): TimeImportColumnsStep {
	const { mapping } = choice;
	const fields = TIME_IMPORT_FIELDS.map((field) => ({
		field,
		columnIndex: mapping[field],
		sample: firstValueOf(table, mapping[field])
	}));
	const missing = missingColumnsOf(mapping);
	const dates = dateOrderReadingOf(table, mapping);
	const dateOrder = resolvedDateOrderOf(dates, choice.dateOrder);
	return {
		headers: table.headers,
		fields,
		dates,
		dateOrder,
		missing,
		leftOutHeaders: ignoredHeadersOf(table.headers, mapping),
		blocker: blockerOf(missing, dates, dateOrder),
		firstRows: table.records.slice(0, FIRST_ROWS_SHOWN),
		rowCount: table.records.length
	};
}

/** The template's order, year first, until a value of the file tells another one. */
function orderOfReading(reading: DateOrderReading): DateOrder {
	if (reading.kind === 'told') {
		return reading.order;
	}
	return 'yearFirst';
}

export type TimeImportReading =
	| { kind: 'refused'; problem: TimeImportSheetProblem }
	| { kind: 'sheet'; sheet: TimeImportSheet };

/**
 * Reads the text of a CSV file into the rows of a time import: the header names the columns, in any order and in
 * the words of the template or of the usual time exports, and every other line that is not blank is a row. A file
 * the import cannot use at all is refused whole, with the reason; what each row holds is judged later, row by row.
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
	const mapping = withDatesOfMoments(table, header.mapping);
	const missingColumns = missingColumnsOf(mapping);
	if (missingColumns.length > 0) {
		return { kind: 'refused', problem: { code: 'missingColumns', columns: missingColumns } };
	}
	const countProblem = rowCountProblemOf(table);
	if (countProblem) {
		return { kind: 'refused', problem: countProblem };
	}
	const dates = dateOrderReadingOf(table, mapping);
	if (dates.kind === 'mixed') {
		const { firstRow, firstValue, row, value } = dates;
		return { kind: 'refused', problem: { code: 'mixedDates', firstRow, firstValue, row, value } };
	}
	return { kind: 'sheet', sheet: timeImportSheetOf(table, mapping, orderOfReading(dates)) };
}
