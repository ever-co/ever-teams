import {
	clockTimeOf,
	dateOrdersOf,
	datePartOf,
	holdsDateAndMore,
	holdsDateAndTime,
	type DateOrder
} from '@/core/lib/utils/time-import-cells';
import {
	NO_TIME_IMPORT_COLUMNS,
	REPORT_ONLY_HEADERS,
	TIME_IMPORT_FIELDS,
	TIME_IMPORT_HEADERS,
	headerWordsOf,
	ignoredHeadersOf,
	missingColumnsOf,
	rowCountProblemOf,
	timeImportSheetOfTable,
	timeImportTableOf,
	type TimeImportColumnsChoice,
	type TimeImportField,
	type TimeImportMapping,
	type TimeImportMissingColumn,
	type TimeImportRecord,
	type TimeImportSheet,
	type TimeImportSheetProblem,
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

/** Columns of time exports the import does not use: they are left out without asking. */
const UNUSED_HEADERS: ReadonlySet<string> = new Set([
	'client',
	'client name',
	'customer',
	'tags',
	'tag',
	'labels',
	'label',
	'amount',
	'rate',
	'hourly rate',
	'billable rate',
	'billable amount',
	'cost',
	'cost rate',
	'cost amount',
	'currency',
	'invoice',
	'invoiced',
	'approved',
	'approval',
	'locked',
	'group',
	'user group',
	'department',
	'team',
	'id',
	'entry id',
	'created',
	'created at',
	'updated',
	'updated at',
	'type',
	'category',
	'location',
	'break',
	'breaks',
	'week',
	'month',
	'year',
	'weekday'
]);

const TEMPLATE_HEADERS: ReadonlySet<string> = new Set(Object.values(TIME_IMPORT_HEADERS));

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

/** The fields read for a day only. */
const DAY_FIELDS: ReadonlyArray<TimeImportField> = ['date', 'endDate'];

function isLeftOutWithoutAsking(words: string): boolean {
	const isBlank = words === '';
	const isReportColumn = REPORT_ONLY_HEADERS.has(words);
	const isUnused = UNUSED_HEADERS.has(words);
	return isBlank || isReportColumn || isUnused;
}

interface HeaderReading {
	mapping: Record<TimeImportField, number | null>;
	/** The words of the first header the file repeats for a field it reads, if any. */
	duplicateHeader: string | null;
	/** Headers the import cannot place by itself: unknown words, or a second header for a field already read. */
	unknownHeaders: string[];
	readsAsTemplate: boolean;
}

function columnHoldsValues(table: TimeImportTable, columnIndex: number): boolean {
	return table.records.some((record) => (record.cells[columnIndex] ?? '').trim() !== '');
}

function readHeaders(table: TimeImportTable): HeaderReading {
	const reading: HeaderReading = {
		mapping: { ...NO_TIME_IMPORT_COLUMNS },
		duplicateHeader: null,
		unknownHeaders: [],
		readsAsTemplate: true
	};
	const wordsByField = new Map<TimeImportField, string>();
	table.headers.forEach((header, index) => {
		const words = headerWordsOf(header);
		const field = FIELD_BY_HEADER.get(words);
		if (!field) {
			// A column without a name is left out while it is empty; one that holds values is asked about, since it may
			// be the end or the duration the file needs
			const isUnnamedWithValues = words === '' && columnHoldsValues(table, index);
			const isLeftOut = isLeftOutWithoutAsking(words) && !isUnnamedWithValues;
			if (!isLeftOut) {
				reading.unknownHeaders.push(header);
			}
			return;
		}
		const heldBy = wordsByField.get(field);
		if (heldBy === undefined) {
			reading.mapping[field] = index;
			wordsByField.set(field, words);
			if (!TEMPLATE_HEADERS.has(words)) {
				reading.readsAsTemplate = false;
			}
			return;
		}
		if (heldBy === words) {
			reading.duplicateHeader ??= words;
			return;
		}
		reading.unknownHeaders.push(header);
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

function holdsTime(value: string): boolean {
	const isTimeAlone = clockTimeOf(value) !== null;
	return isTimeAlone || holdsDateAndTime(value);
}

/** A value that holds no time at all is a typo of its row: it does not tell what the column holds. */
function firstTimeOf(table: TimeImportTable, columnIndex: number | null): string | null {
	if (columnIndex === null) {
		return null;
	}
	for (const record of table.records) {
		const cell = record.cells[columnIndex] ?? '';
		const value = cell.trim();
		if (holdsTime(value)) {
			return value;
		}
	}
	return null;
}

function holdsDatesAndTimes(table: TimeImportTable, columnIndex: number | null): boolean {
	const value = firstTimeOf(table, columnIndex);
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

/** A date or an end date column that holds a date and a time gives the time of its moment too. */
function withTimesOfDates(table: TimeImportTable, mapping: TimeImportMapping): TimeImportMapping {
	const withTimes: Record<TimeImportField, number | null> = { ...mapping };
	const lacksStartTime = mapping.startTime === null;
	if (lacksStartTime && holdsDatesAndTimes(table, mapping.date)) {
		withTimes.startTime = mapping.date;
	}
	const lacksEndTime = mapping.endTime === null;
	if (lacksEndTime && holdsDatesAndTimes(table, mapping.endDate)) {
		withTimes.endTime = mapping.endDate;
	}
	return withTimes;
}

/** The first value with more than a date decides whether the column holds times the import cannot read (`9h30`). */
function holdsTimesItCannotRead(table: TimeImportTable, columnIndex: number | null): boolean {
	if (columnIndex === null) {
		return false;
	}
	for (const record of table.records) {
		const cell = record.cells[columnIndex] ?? '';
		const value = cell.trim();
		if (holdsDateAndMore(value)) {
			return !holdsDateAndTime(value);
		}
	}
	return false;
}

function datesHoldTimesItCannotRead(table: TimeImportTable, mapping: TimeImportMapping): boolean {
	const startsUnread = holdsTimesItCannotRead(table, mapping.date);
	const endsUnread = holdsTimesItCannotRead(table, mapping.endDate);
	return startsUnread || endsUnread;
}

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

/** The columns read for a day: the date and the end date, whatever else a start or an end column holds. */
function dayColumnsOf(mapping: TimeImportMapping): Set<number> {
	const columns = new Set<number>();
	for (const field of DAY_FIELDS) {
		const columnIndex = mapping[field];
		if (columnIndex !== null) {
			columns.add(columnIndex);
		}
	}
	return columns;
}

function datedValuesOf(table: TimeImportTable, mapping: TimeImportMapping): DatedValue[] {
	const columns = dateColumnsOf(mapping);
	const dayColumns = dayColumnsOf(mapping);
	const values: DatedValue[] = [];
	for (const record of table.records) {
		for (const columnIndex of columns) {
			const cell = record.cells[columnIndex] ?? '';
			// A column read for its times tells the date order only through a date and time it can read: a bare date
			// there is no time, and leaves its own row out instead of the whole file
			const isTimeColumn = !dayColumns.has(columnIndex);
			const isUnreadTime = isTimeColumn && !holdsDateAndTime(cell);
			if (isUnreadTime) {
				continue;
			}
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

export const CHOOSABLE_DATE_ORDERS: ReadonlyArray<DateOrder> = ['dayFirst', 'monthFirst'];

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
	const isFittingChoice = chosen !== null && CHOOSABLE_DATE_ORDERS.includes(chosen);
	if (!isFittingChoice) {
		return null;
	}
	return chosen;
}

const FIRST_ROWS_SHOWN = 3;

type TimeImportColumnsBlocker = 'missing' | 'mixedDates' | 'dateOrder';

export interface TimeImportColumnsStepField {
	field: TimeImportField;
	columnIndex: number | null;
	sample: string | null;
}

export interface TimeImportColumnsStep {
	headers: ReadonlyArray<string>;
	fields: TimeImportColumnsStepField[];
	dates: DateOrderReading;
	dateOrder: DateOrder | null;
	missing: TimeImportMissingColumn[];
	leftOutHeaders: string[];
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

type TimeImportReading =
	| { kind: 'refused'; problem: TimeImportSheetProblem }
	| { kind: 'columns'; table: TimeImportTable; choice: TimeImportColumnsChoice }
	| {
			kind: 'sheet';
			table: TimeImportTable;
			choice: TimeImportColumnsChoice;
			sheet: TimeImportSheet;
			/** Read as the template reads: its own headers, dates year first, nothing chosen by hand. */
			readsAsTemplate: boolean;
	  };

type StoredChoiceOf = (headers: ReadonlyArray<string>) => TimeImportColumnsChoice | null;

const NO_STORED_CHOICE: StoredChoiceOf = () => null;

function infersFields(read: TimeImportMapping, suggested: TimeImportMapping): boolean {
	return TIME_IMPORT_FIELDS.some((field) => read[field] !== suggested[field]);
}

/**
 * The template has always read its dates year first: a template file whose dates are written two ways keeps that
 * order, so only the rows written another way are left out, not the whole file. Any other file is refused for it.
 */
function sheetDateOrderOf(dates: DateOrderReading, dateOrder: DateOrder | null): DateOrder | null {
	if (dates.kind === 'mixed') {
		return 'yearFirst';
	}
	return dateOrder;
}

/**
 * Reads the text of a CSV file into the rows of a time import: the header names the columns, in any order and in
 * the words of the template or of the usual time exports, and every other line that is not blank is a row. A file
 * the import can read by itself goes straight to its rows. A file with headers it does not know, or whose dates fit
 * two formats, stops on the Columns step, filled with what the import recognised or with the choice kept for the
 * same headers. A file the import cannot use at all is refused whole, with the reason: among them a file whose
 * headers are all known and still miss a part of an entry, since no column of it could give that part, unless its
 * date columns hold times the import cannot read, which the Columns step then shows.
 */
export function timeImportReadingOf(
	text: string,
	storedChoiceOf: StoredChoiceOf = NO_STORED_CHOICE
): TimeImportReading {
	const tableReading = timeImportTableOf(text);
	if (!tableReading.table) {
		return { kind: 'refused', problem: tableReading.problem };
	}
	const { table } = tableReading;
	const header = readHeaders(table);
	if (header.duplicateHeader) {
		return { kind: 'refused', problem: { code: 'duplicateColumn', header: header.duplicateHeader } };
	}
	const stored = storedChoiceOf(table.headers);
	const withDates = withDatesOfMoments(table, header.mapping);
	const suggested = withTimesOfDates(table, withDates);
	const mapping = stored?.mapping ?? suggested;
	const missingColumns = missingColumnsOf(mapping);
	const isMissing = missingColumns.length > 0;
	const hasStoredChoice = stored !== null;
	const hasUnknownHeaders = header.unknownHeaders.length > 0;
	const asksAboutHeaders = hasUnknownHeaders && !hasStoredChoice;
	const hasUnreadTimes = datesHoldTimesItCannotRead(table, mapping);
	const canChooseColumns = asksAboutHeaders || hasStoredChoice || hasUnreadTimes;
	if (isMissing && !canChooseColumns) {
		return { kind: 'refused', problem: { code: 'missingColumns', columns: missingColumns } };
	}
	const countProblem = rowCountProblemOf(table);
	if (countProblem) {
		return { kind: 'refused', problem: countProblem };
	}
	const choice: TimeImportColumnsChoice = { mapping, dateOrder: stored?.dateOrder ?? null };
	const dates = dateOrderReadingOf(table, mapping);
	const dateOrder = resolvedDateOrderOf(dates, choice.dateOrder);
	const asksDateOrder = dates.kind === 'ambiguous' && dateOrder === null;
	const needsChoice = isMissing || asksAboutHeaders || asksDateOrder;
	if (needsChoice) {
		return { kind: 'columns', table, choice };
	}
	const infersColumns = infersFields(header.mapping, suggested);
	const isReadByItself = !infersColumns && !hasStoredChoice;
	const readsTemplateHeaders = header.readsAsTemplate && isReadByItself;
	if (dates.kind === 'mixed' && !readsTemplateHeaders) {
		const { firstRow, firstValue, row, value } = dates;
		return { kind: 'refused', problem: { code: 'mixedDates', firstRow, firstValue, row, value } };
	}
	const sheetOrder = sheetDateOrderOf(dates, dateOrder);
	if (!sheetOrder) {
		return { kind: 'columns', table, choice };
	}
	const isTemplateOrder = sheetOrder === 'yearFirst';
	const readsAsTemplate = readsTemplateHeaders && isTemplateOrder;
	const sheet = timeImportSheetOfTable(table, mapping, sheetOrder);
	return { kind: 'sheet', table, choice, sheet, readsAsTemplate };
}
