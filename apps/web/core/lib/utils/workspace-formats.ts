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

/** The clocks Gauzy stores on the organization (`timeFormat`), and the 12-hour one it gives a new organization. */
export const WORKSPACE_CLOCKS = [24, 12] as const;

export type WorkspaceClock = (typeof WORKSPACE_CLOCKS)[number];

/** The sides of an amount Gauzy stores for the currency sign (`currencyPosition`), `LEFT` for a new organization. */
export const WORKSPACE_CURRENCY_POSITIONS = ['LEFT', 'RIGHT'] as const;

export type WorkspaceCurrencyPosition = (typeof WORKSPACE_CURRENCY_POSITIONS)[number];

export function workspaceClockOf(stored: unknown): WorkspaceClock | null {
	const hours = Number(stored);
	const clock = WORKSPACE_CLOCKS.find((known) => known === hours);
	return clock ?? null;
}

export function workspaceCurrencyPositionOf(stored: unknown): WorkspaceCurrencyPosition | null {
	const position = WORKSPACE_CURRENCY_POSITIONS.find((known) => known === stored);
	return position ?? null;
}

/**
 * The reader's language with the workspace's formats: what a report writes its dates, times and numbers with. A
 * missing clock or currency side leaves them to the reader's language.
 */
export interface WorkspaceLocale {
	tag: string;
	dateFormat: WorkspaceDateFormat | null;
	numberFormat: WorkspaceNumberFormat | null;
	clock?: WorkspaceClock | null;
	currencyPosition?: WorkspaceCurrencyPosition | null;
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
	const clock = locale.clock ?? '';
	const currencyPosition = locale.currencyPosition ?? '';
	return [locale.tag, dateFormat, numberFormat, clock, currencyPosition].join('|');
}

function clockChoiceOf(locale: FormatLocale): WorkspaceClock | null {
	if (typeof locale === 'string') {
		return null;
	}
	return locale.clock ?? null;
}

function currencyPositionChoiceOf(locale: FormatLocale): WorkspaceCurrencyPosition | null {
	if (typeof locale === 'string') {
		return null;
	}
	return locale.currencyPosition ?? null;
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

const NUMBER_PART_TYPES: ReadonlySet<string> = new Set([
	'integer',
	'group',
	'decimal',
	'fraction',
	'compact',
	'exponentSeparator',
	'exponentMinusSign',
	'exponentInteger',
	'infinity',
	'nan'
]);

const BIDI_MARKS = /[‎‏؜]/g;

function isNumberPart(part: { type: string }): boolean {
	return NUMBER_PART_TYPES.has(part.type);
}

/** A literal holding nothing but spaces and direction marks: the gap a language leaves between a sign and a number. */
function isGapPart(part: { type: string; value: string } | undefined): boolean {
	if (!part || part.type !== 'literal') {
		return false;
	}
	const visible = part.value.replace(BIDI_MARKS, '');
	return visible.trim() === '';
}

/** The parts without the currency sign and the gap that tied it to the number. */
function partsWithoutCurrencyOf<Part extends { type: string; value: string }>(
	parts: ReadonlyArray<Part>,
	currencyIndex: number
): Part[] {
	let from = currencyIndex;
	let to = currencyIndex;
	if (isGapPart(parts[currencyIndex - 1])) {
		from = currencyIndex - 1;
	} else if (isGapPart(parts[currencyIndex + 1])) {
		to = currencyIndex + 1;
	}
	return [...parts.slice(0, from), ...parts.slice(to + 1)];
}

/** A currency written as letters (a code such as USD) keeps a space before the number it leads; a symbol does not. */
function gapAfterLeadingCurrencyOf(currency: { value: string }): ReadonlyArray<Intl.NumberFormatPart> {
	const isWrittenAsLetters = /^\p{L}+$/u.test(currency.value);
	if (!isWrittenAsLetters) {
		return [];
	}
	return [{ type: 'literal', value: NO_BREAK_SPACE }];
}

/** The parts with the currency sign moved to the side the workspace chose; already there, they stay as they are. */
function placedCurrencyPartsOf(
	parts: ReadonlyArray<Intl.NumberFormatPart>,
	position: WorkspaceCurrencyPosition
): Intl.NumberFormatPart[] {
	const currencyIndex = parts.findIndex((part) => part.type === 'currency');
	const firstNumberIndex = parts.findIndex(isNumberPart);
	const hasCurrencyAndNumber = currencyIndex >= 0 && firstNumberIndex >= 0;
	if (!hasCurrencyAndNumber) {
		return [...parts];
	}
	const isCurrencyBefore = currencyIndex < firstNumberIndex;
	const wantsCurrencyBefore = position === 'LEFT';
	if (isCurrencyBefore === wantsCurrencyBefore) {
		return [...parts];
	}
	const currency = parts[currencyIndex];
	const rest = partsWithoutCurrencyOf(parts, currencyIndex);
	if (wantsCurrencyBefore) {
		// The minus sign and any direction mark stay ahead of the sign: -€12, not €-12
		const numberStart = rest.findIndex(isNumberPart);
		return [
			...rest.slice(0, numberStart),
			currency,
			...gapAfterLeadingCurrencyOf(currency),
			...rest.slice(numberStart)
		];
	}
	return [...rest, { type: 'literal', value: NO_BREAK_SPACE }, currency];
}

function separatedPartsOf<Part extends { type: string; value: string }>(
	parts: ReadonlyArray<Part>,
	choice: WorkspaceNumberFormat | null
): Part[] {
	if (choice === null) {
		return [...parts];
	}
	const separators = NUMBER_SEPARATORS[choice];
	return parts.map((part) => separatedPartOf(part, separators));
}

function baseNumberFormatOf(
	tag: string,
	choice: WorkspaceNumberFormat | null,
	options: Intl.NumberFormatOptions
): Intl.NumberFormat {
	if (choice === null) {
		return new Intl.NumberFormat(tag, options);
	}
	// Spanish, Italian, Polish and Bulgarian leave a four-digit number ungrouped: no separator would be there to replace
	const useGrouping = options.useGrouping ?? 'always';
	// A chosen format reads the same for every member, so it is written in Western digits whatever the language
	return new Intl.NumberFormat(tag, { ...options, useGrouping, numberingSystem: 'latn' });
}

/**
 * A number format of the reader's language that groups thousands and marks decimals the workspace's way, and puts a
 * currency sign on the side the workspace chose. The sign itself and the percent sign stay the reader's.
 */
export function numberFormatOf(locale: FormatLocale, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
	const tag = localeTagOf(locale);
	const choice = numberFormatChoiceOf(locale);
	const position = currencyPositionChoiceOf(locale);
	const isCurrency = options.style === 'currency';
	const placesCurrency = isCurrency && position !== null;
	const keepsLanguageWay = choice === null && !placesCurrency;
	if (keepsLanguageWay) {
		return new Intl.NumberFormat(tag, options);
	}
	const base = baseNumberFormatOf(tag, choice, options);
	const partsOf = (value?: NumberValue) => {
		const separated = separatedPartsOf(basePartsOf(base, value), choice);
		if (placesCurrency && position !== null) {
			return placedCurrencyPartsOf(separated, position);
		}
		return separated;
	};
	const rangePartsOf = (start: NumberValue, end: NumberValue) => {
		const parts = base.formatRangeToParts(start, end);
		return separatedPartsOf(parts, choice);
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
	const clocked = clockedOptionsOf(clockChoiceOf(locale), options);
	const choice = dateFormatChoiceOf(locale);
	if (choice === null) {
		return new Intl.DateTimeFormat(tag, clocked);
	}
	const written = writtenDateOf(clocked);
	if (written === null) {
		return new Intl.DateTimeFormat(tag, clocked);
	}
	return patternedDateFormatOf(tag, DATE_PATTERNS[choice], written, clocked);
}

/**
 * The options with the workspace's clock when they ask for a time: it wins over a clock the caller asked for, so every
 * time of day of every page reads alike. A 12-hour time drops the leading zero (2:05 PM, not 02:05 PM).
 */
function clockedOptionsOf(clock: WorkspaceClock | null, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
	const asksTime = options.hour !== undefined || options.timeStyle !== undefined;
	if (clock === null || !asksTime) {
		return options;
	}
	const clocked: Intl.DateTimeFormatOptions = { ...options };
	delete clocked.hour12;
	if (clock === 24) {
		clocked.hourCycle = 'h23';
		return clocked;
	}
	clocked.hourCycle = 'h12';
	if (clocked.hour === '2-digit') {
		clocked.hour = 'numeric';
	}
	return clocked;
}
