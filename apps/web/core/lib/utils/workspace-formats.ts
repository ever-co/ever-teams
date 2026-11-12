/**
 * How a workspace writes its dates and numbers. Gauzy keeps both on the organization as free text: its own apps read
 * `dateFormat` as a date pattern, so the patterns below are spelled the way they read them; `numberFormat` is read by
 * this app only. Any other stored value, and none, leave every reader with their own language's way.
 */
export const WORKSPACE_DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD'] as const;

export type WorkspaceDateFormat = (typeof WORKSPACE_DATE_FORMATS)[number];

export const WORKSPACE_NUMBER_FORMATS = ['1,234.56', '1.234,56', '1 234,56', "1'234.56"] as const;

export type WorkspaceNumberFormat = (typeof WORKSPACE_NUMBER_FORMATS)[number];

type StoredFormat = string | null | undefined;

function knownFormatOf<Format extends string>(known: ReadonlyArray<Format>, stored: StoredFormat): Format | null {
	const match = known.find((format) => format === stored);
	return match ?? null;
}

export function workspaceDateFormatOf(stored: StoredFormat): WorkspaceDateFormat | null {
	return knownFormatOf(WORKSPACE_DATE_FORMATS, stored);
}

export function workspaceNumberFormatOf(stored: StoredFormat): WorkspaceNumberFormat | null {
	return knownFormatOf(WORKSPACE_NUMBER_FORMATS, stored);
}

/** The reader's language with the workspace's formats: what a report writes its dates and numbers with. */
export interface WorkspaceLocale {
	tag: string;
	dateFormat: WorkspaceDateFormat | null;
	numberFormat: WorkspaceNumberFormat | null;
}

/** A bare language tag writes dates and numbers the way that language does. */
export type FormatLocale = string | WorkspaceLocale;

export function localeTagOf(locale: FormatLocale): string {
	if (typeof locale === 'string') {
		return locale;
	}
	return locale.tag;
}

/** A text that differs whenever two locales write a date or a number differently: the key of a cache of formats. */
export function localeKeyOf(locale: FormatLocale): string {
	if (typeof locale === 'string') {
		return locale;
	}
	const dateFormat = locale.dateFormat ?? '';
	const numberFormat = locale.numberFormat ?? '';
	return [locale.tag, dateFormat, numberFormat].join('|');
}

function dateFormatChoiceOf(locale: FormatLocale): WorkspaceDateFormat | null {
	if (typeof locale === 'string') {
		return null;
	}
	return locale.dateFormat;
}

function numberFormatChoiceOf(locale: FormatLocale): WorkspaceNumberFormat | null {
	if (typeof locale === 'string') {
		return null;
	}
	return locale.numberFormat;
}

/** Whether the workspace chose a date format: without one, a date that was written as data stays so. */
export function hasDateFormat(locale: FormatLocale): boolean {
	return dateFormatChoiceOf(locale) !== null;
}

/** Whether the workspace chose a number format: without one, a number written with a fixed mark keeps it. */
export function hasNumberFormat(locale: FormatLocale): boolean {
	return numberFormatChoiceOf(locale) !== null;
}

function textOf(parts: ReadonlyArray<{ value: string }>): string {
	return parts.map((part) => part.value).join('');
}

interface NumberSeparators {
	group: string;
	decimal: string;
}

const NO_BREAK_SPACE = '\u00A0';
const TYPOGRAPHIC_APOSTROPHE = '\u2019';

const NUMBER_SEPARATORS: Readonly<Record<WorkspaceNumberFormat, NumberSeparators>> = {
	'1,234.56': { group: ',', decimal: '.' },
	'1.234,56': { group: '.', decimal: ',' },
	'1 234,56': { group: NO_BREAK_SPACE, decimal: ',' },
	"1'234.56": { group: TYPOGRAPHIC_APOSTROPHE, decimal: '.' }
};

function separatedPartOf<Part extends { type: string; value: string }>(part: Part, separators: NumberSeparators): Part {
	if (part.type === 'group') {
		return { ...part, value: separators.group };
	}
	if (part.type === 'decimal') {
		return { ...part, value: separators.decimal };
	}
	return part;
}

type NumberValue = number | bigint | Intl.StringNumericLiteral;

function basePartsOf(base: Intl.NumberFormat, value: NumberValue | undefined): Intl.NumberFormatPart[] {
	if (value === undefined) {
		return base.formatToParts();
	}
	return base.formatToParts(value);
}

/**
 * A number format of the reader's language that groups thousands and marks decimals the workspace's way. The currency
 * sign, its side and the percent sign stay the reader's.
 */
export function numberFormatOf(locale: FormatLocale, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
	const tag = localeTagOf(locale);
	const choice = numberFormatChoiceOf(locale);
	if (choice === null) {
		return new Intl.NumberFormat(tag, options);
	}
	const separators = NUMBER_SEPARATORS[choice];
	// Spanish, Italian, Polish and Bulgarian leave a four-digit number ungrouped: no separator would be there to replace
	const useGrouping = options.useGrouping ?? 'always';
	// A chosen format reads the same for every member, so it is written in Western digits whatever the language
	const base = new Intl.NumberFormat(tag, { ...options, useGrouping, numberingSystem: 'latn' });
	const partsOf = (value?: NumberValue) => {
		const parts = basePartsOf(base, value);
		return parts.map((part) => separatedPartOf(part, separators));
	};
	const rangePartsOf = (start: NumberValue, end: NumberValue) => {
		const parts = base.formatRangeToParts(start, end);
		return parts.map((part) => separatedPartOf(part, separators));
	};
	return {
		format: (value: NumberValue) => textOf(partsOf(value)),
		formatToParts: partsOf,
		formatRange: (start: NumberValue, end: NumberValue) => textOf(rangePartsOf(start, end)),
		formatRangeToParts: rangePartsOf,
		resolvedOptions: () => base.resolvedOptions()
	};
}

type DateField = 'day' | 'month' | 'year';

interface DatePattern {
	fields: ReadonlyArray<DateField>;
	separator: string;
}

const DATE_PATTERNS: Readonly<Record<WorkspaceDateFormat, DatePattern>> = {
	'MM/DD/YYYY': { fields: ['month', 'day', 'year'], separator: '/' },
	'DD/MM/YYYY': { fields: ['day', 'month', 'year'], separator: '/' },
	'DD-MM-YYYY': { fields: ['day', 'month', 'year'], separator: '-' },
	'DD.MM.YYYY': { fields: ['day', 'month', 'year'], separator: '.' },
	'YYYY-MM-DD': { fields: ['year', 'month', 'day'], separator: '-' }
};

type WeekdayStyle = NonNullable<Intl.DateTimeFormatOptions['weekday']>;

/** What a formatter's options ask to be written, once they ask for a day together with its month. */
interface WrittenDate {
	weekday: WeekdayStyle | null;
	showsYear: boolean;
	time: Intl.DateTimeFormatOptions | null;
}

const DATE_FIELDS = ['weekday', 'era', 'year', 'month', 'day'] as const;
const TIME_FIELDS = ['hour', 'minute', 'second', 'fractionalSecondDigits', 'dayPeriod', 'timeZoneName'] as const;

function clockOptionsOf(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
	return { hour12: options.hour12, hourCycle: options.hourCycle, timeZone: options.timeZone };
}

function styledDateOf(options: Intl.DateTimeFormatOptions): WrittenDate | null {
	if (options.dateStyle === undefined) {
		return null;
	}
	let weekday: WeekdayStyle | null = null;
	if (options.dateStyle === 'full') {
		weekday = 'long';
	}
	let time: Intl.DateTimeFormatOptions | null = null;
	if (options.timeStyle !== undefined) {
		time = { ...clockOptionsOf(options), timeStyle: options.timeStyle };
	}
	return { weekday, showsYear: true, time };
}

function timeFieldsOf(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
	return {
		...clockOptionsOf(options),
		hour: options.hour,
		minute: options.minute,
		second: options.second,
		fractionalSecondDigits: options.fractionalSecondDigits,
		dayPeriod: options.dayPeriod,
		timeZoneName: options.timeZoneName
	};
}

function fieldDateOf(options: Intl.DateTimeFormatOptions): WrittenDate | null {
	const asksDateField = DATE_FIELDS.some((field) => options[field] !== undefined);
	const asksTimeField = TIME_FIELDS.some((field) => options[field] !== undefined);
	const asksNothing = !asksDateField && !asksTimeField;
	if (asksNothing) {
		// Without a field, Intl writes the numeric day, month and year
		return { weekday: null, showsYear: true, time: null };
	}
	const hasDay = options.day !== undefined;
	const hasMonth = options.month !== undefined;
	const isCalendarDate = hasDay && hasMonth;
	if (!isCalendarDate) {
		return null;
	}
	const hasEra = options.era !== undefined;
	const hasHour = options.hour !== undefined;
	const isTimeWithoutHour = asksTimeField && !hasHour;
	if (hasEra || isTimeWithoutHour) {
		return null;
	}
	let time: Intl.DateTimeFormatOptions | null = null;
	if (hasHour) {
		time = timeFieldsOf(options);
	}
	return { weekday: options.weekday ?? null, showsYear: options.year !== undefined, time };
}

function writtenDateOf(options: Intl.DateTimeFormatOptions): WrittenDate | null {
	const hasDateStyle = options.dateStyle !== undefined;
	const hasTimeStyle = options.timeStyle !== undefined;
	if (hasDateStyle || hasTimeStyle) {
		return styledDateOf(options);
	}
	return fieldDateOf(options);
}

type Moment = Date | number;
type RangeMoment = Date | number | bigint;
type RangeSource = Intl.DateTimeRangeFormatPart['source'];
type OptionalPartFormat = Intl.DateTimeFormat | null;

const PART_GAP: Intl.DateTimeFormatPart = { type: 'literal', value: ' ' };
const RANGE_GAP = ' \u2013 ';

function momentOf(value: RangeMoment): Moment {
	if (typeof value === 'bigint') {
		return Number(value);
	}
	return value;
}

function writtenFieldsOf(pattern: DatePattern, showsYear: boolean): DateField[] {
	if (showsYear) {
		return [...pattern.fields];
	}
	return pattern.fields.filter((field) => field !== 'year');
}

function weekdayPartsOf(format: OptionalPartFormat, moment: Moment): Intl.DateTimeFormatPart[] {
	if (!format) {
		return [];
	}
	const parts = format.formatToParts(moment);
	const weekdayParts = parts.filter((part) => part.type === 'weekday');
	return [...weekdayParts, PART_GAP];
}

function patternPartsOf(
	numeric: Intl.DateTimeFormat,
	fields: ReadonlyArray<DateField>,
	separator: string,
	moment: Moment
): Intl.DateTimeFormatPart[] {
	const values = new Map<string, string>();
	for (const part of numeric.formatToParts(moment)) {
		values.set(part.type, part.value);
	}
	const parts: Intl.DateTimeFormatPart[] = [];
	for (const field of fields) {
		const isFirstField = parts.length === 0;
		if (!isFirstField) {
			parts.push({ type: 'literal', value: separator });
		}
		parts.push({ type: field, value: values.get(field) ?? '' });
	}
	return parts;
}

function timePartsOf(format: OptionalPartFormat, moment: Moment): Intl.DateTimeFormatPart[] {
	if (!format) {
		return [];
	}
	return [PART_GAP, ...format.formatToParts(moment)];
}

function sourcedPartsOf(
	parts: ReadonlyArray<Intl.DateTimeFormatPart>,
	source: RangeSource
): Intl.DateTimeRangeFormatPart[] {
	return parts.map((part) => ({ ...part, source }));
}

function patternedDateFormatOf(
	tag: string,
	pattern: DatePattern,
	written: WrittenDate,
	options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
	const base = new Intl.DateTimeFormat(tag, options);
	const timeZone = options.timeZone;
	// A chosen pattern reads the same for every member: Western digits on the Gregorian calendar, whatever the language
	const numeric = new Intl.DateTimeFormat(tag, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone,
		numberingSystem: 'latn',
		calendar: 'gregory'
	});
	let weekdayFormat: OptionalPartFormat = null;
	if (written.weekday) {
		weekdayFormat = new Intl.DateTimeFormat(tag, { weekday: written.weekday, timeZone });
	}
	let timeFormat: OptionalPartFormat = null;
	if (written.time) {
		timeFormat = new Intl.DateTimeFormat(tag, written.time);
	}
	const fields = writtenFieldsOf(pattern, written.showsYear);

	const partsOf = (date?: Moment): Intl.DateTimeFormatPart[] => {
		const moment = date ?? Date.now();
		return [
			...weekdayPartsOf(weekdayFormat, moment),
			...patternPartsOf(numeric, fields, pattern.separator, moment),
			...timePartsOf(timeFormat, moment)
		];
	};
	const rangePartsOf = (start: RangeMoment, end: RangeMoment): Intl.DateTimeRangeFormatPart[] => {
		const startParts = partsOf(momentOf(start));
		const endParts = partsOf(momentOf(end));
		const isWrittenAlike = textOf(startParts) === textOf(endParts);
		if (isWrittenAlike) {
			return sourcedPartsOf(startParts, 'shared');
		}
		return [
			...sourcedPartsOf(startParts, 'startRange'),
			{ type: 'literal', value: RANGE_GAP, source: 'shared' },
			...sourcedPartsOf(endParts, 'endRange')
		];
	};
	return {
		format: (date?: Moment) => textOf(partsOf(date)),
		formatToParts: partsOf,
		formatRange: (start: RangeMoment, end: RangeMoment) => textOf(rangePartsOf(start, end)),
		formatRangeToParts: rangePartsOf,
		resolvedOptions: () => base.resolvedOptions()
	};
}

/**
 * A date format of the reader's language that writes a day and its month in the workspace's pattern, the year too
 * when the options ask for it. The weekday and the time stay the reader's, and so does anything that is not a
 * calendar date: a weekday alone, a month and its year, an hour.
 */
export function dateFormatOf(locale: FormatLocale, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
	const tag = localeTagOf(locale);
	const choice = dateFormatChoiceOf(locale);
	if (choice === null) {
		return new Intl.DateTimeFormat(tag, options);
	}
	const written = writtenDateOf(options);
	if (written === null) {
		return new Intl.DateTimeFormat(tag, options);
	}
	return patternedDateFormatOf(tag, DATE_PATTERNS[choice], written, options);
}
