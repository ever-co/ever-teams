import { dateFormatOf, localeTagOf, type FormatLocale } from './workspace-formats';

/**
 * How a date field and a time field write their value, and read back what is typed in them. The values are those of
 * the native fields they replaced (#5318): a day as `YYYY-MM-DD`, a time of day as `HH:mm`, `''` for none. The text
 * follows the workspace's date format and clock (the reader's language without them), in Western digits, so the text
 * a field shows always reads back as its value.
 */
export interface FieldWriting {
	/** The value as the field shows it; `''` for no value or one it cannot read. */
	textOf: (value: string) => string;
	/** The value a text names, or null when it names none. */
	read: (text: string) => string | null;
	/** An example of the text, for an empty field. */
	placeholder: string;
}

const MINUTES_PER_HOUR = 60;

const HOURS_PER_HALF_DAY = 12;

const LAST_HOUR = 23;

const TIME_VALUE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_VALUE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hours, then minutes after a colon, a dot or an "h" (`9:30`, `9.30`, `9h30`), or a run of digits (`930`). */
const TYPED_TIME = /(\d+)(?:\s*[:.h]\s*(\d*))?/;

/** The zeros of the digit sets a keyboard may type besides `0-9`: Arabic-Indic, Persian, full-width. */
const OTHER_ZEROS = [0x0660, 0x06f0, 0xff10];

/** Marks some languages write around digits to keep their direction. */
const DIRECTION_MARKS = /[‎‏؜]/g;

const NOT_A_LETTER = /[^\p{L}]/gu;

/** A day whose day and month read apart in every order (31, 12), for the example and the order of the fields. */
const EXAMPLE_MONTH_INDEX = 11;

const EXAMPLE_DAY = 31;

const MONTHS_PER_YEAR = 12;

const EXAMPLE_MINUTES = 9 * MINUTES_PER_HOUR;

const EVENING_MINUTES = 21 * MINUTES_PER_HOUR;

const ISO_ORDER: DayField[] = ['year', 'month', 'day'];

type DayField = 'year' | 'month' | 'day';

type DayPeriod = 'am' | 'pm' | 'none';

interface DayPeriodWords {
	am: Set<string>;
	pm: Set<string>;
	/** Words the format writes beside the time (`ч.` in Bulgarian), which say nothing about the half of the day. */
	beside: string[];
}

function twoDigits(value: number) {
	return String(value).padStart(2, '0');
}

function westernDigitsOf(text: string) {
	let western = '';
	for (const char of text) {
		const code = char.codePointAt(0) ?? 0;
		const zero = OTHER_ZEROS.find((start) => code >= start && code <= start + 9);
		western += zero === undefined ? char : String(code - zero);
	}
	return western;
}

function cleanTextOf(text: string) {
	return westernDigitsOf(text).replace(DIRECTION_MARKS, '').trim().toLowerCase();
}

function lettersOf(text: string) {
	return text.replace(NOT_A_LETTER, '').toLowerCase();
}

function partTextOf(format: Intl.DateTimeFormat, moment: Date, type: Intl.DateTimeFormatPartTypes) {
	return format
		.formatToParts(moment)
		.filter((part) => part.type === type)
		.map((part) => part.value)
		.join('');
}

/** Minutes after midnight of an `HH:mm` value; null for any other text. */
export function minutesOfTimeValue(value: string): number | null {
	const match = TIME_VALUE.exec(value);
	if (!match) {
		return null;
	}
	return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
}

/** The `HH:mm` value of a number of minutes after midnight. */
export function timeValueOf(minutes: number): string {
	return `${twoDigits(Math.floor(minutes / MINUTES_PER_HOUR))}:${twoDigits(minutes % MINUTES_PER_HOUR)}`;
}

/** A time of day on a fixed day of UTC, which no daylight-saving change moves. */
function momentOfMinutes(minutes: number) {
	return new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / MINUTES_PER_HOUR), minutes % MINUTES_PER_HOUR));
}

/** Hours with two digits on a 24-hour clock (`09:05`), as few as needed on a 12-hour one (`9:05 AM`). */
function timeFormatOf(locale: FormatLocale) {
	const options: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC',
		numberingSystem: 'latn'
	};
	const format = dateFormatOf(locale, options);
	const cycle = format.resolvedOptions().hourCycle;
	if (cycle === 'h23' || cycle === 'h24') {
		return dateFormatOf(locale, { ...options, hour: '2-digit' });
	}
	return format;
}

function dayPeriodWordsOf(locale: FormatLocale, shown: Intl.DateTimeFormat): DayPeriodWords {
	const twelveHours = new Intl.DateTimeFormat(localeTagOf(locale), {
		hour: 'numeric',
		minute: '2-digit',
		hourCycle: 'h12',
		timeZone: 'UTC',
		numberingSystem: 'latn'
	});
	const morning = momentOfMinutes(EXAMPLE_MINUTES);
	const evening = momentOfMinutes(EVENING_MINUTES);
	const am = new Set(['a', 'am']);
	const pm = new Set(['p', 'pm']);
	const morningWord = lettersOf(partTextOf(twelveHours, morning, 'dayPeriod'));
	const eveningWord = lettersOf(partTextOf(twelveHours, evening, 'dayPeriod'));
	if (morningWord) {
		am.add(morningWord);
	}
	if (eveningWord) {
		pm.add(eveningWord);
	}
	const beside = [twelveHours, shown]
		.map((format) => lettersOf(partTextOf(format, evening, 'literal')))
		.filter((word) => word !== '');
	return { am, pm, beside };
}

/** The half of the day the letters of a typed time name; null when they name something else. */
function dayPeriodOf(letters: string, words: DayPeriodWords): DayPeriod | null {
	let left = letters;
	for (const word of words.beside) {
		left = left.replaceAll(word, '');
	}
	if (left === '') {
		return 'none';
	}
	if (words.pm.has(left)) {
		return 'pm';
	}
	if (words.am.has(left)) {
		return 'am';
	}
	return null;
}

function hourOfDayOf(hours: number, period: DayPeriod): number | null {
	if (period === 'none') {
		return hours <= LAST_HOUR ? hours : null;
	}
	if (hours > HOURS_PER_HALF_DAY) {
		return null;
	}
	const halfDayHour = hours % HOURS_PER_HALF_DAY;
	return period === 'pm' ? halfDayHour + HOURS_PER_HALF_DAY : halfDayHour;
}

/**
 * The `HH:mm` value of a typed time: `9:30`, `9.30`, `9h30`, `930`, `21:30`, `9:30 pm`, `9p`, or the half of the
 * day in the reader's language (`下午9:30`). Without a half of the day the hours are read on a 24-hour clock.
 */
function readTypedTime(text: string, words: DayPeriodWords): string | null {
	const clean = cleanTextOf(text);
	const match = TYPED_TIME.exec(clean);
	if (!match) {
		return null;
	}
	const rest = clean.slice(0, match.index) + clean.slice(match.index + match[0].length);
	if (/\d/.test(rest)) {
		return null;
	}
	const period = dayPeriodOf(lettersOf(rest), words);
	if (period === null) {
		return null;
	}
	let hourText = match[1];
	let minuteText = match[2] ?? '';
	const isDigitRun = match[2] === undefined && hourText.length > 2;
	if (isDigitRun) {
		minuteText = hourText.slice(-2);
		hourText = hourText.slice(0, -2);
	}
	if (hourText.length > 2 || minuteText.length > 2) {
		return null;
	}
	const minutes = Number(minuteText || '0');
	const hour = hourOfDayOf(Number(hourText), period);
	if (hour === null || minutes >= MINUTES_PER_HOUR) {
		return null;
	}
	return timeValueOf(hour * MINUTES_PER_HOUR + minutes);
}

/** How a time field writes and reads a time of day: in the workspace's clock, else the reader's language's. */
export function timeWritingOf(locale: FormatLocale): FieldWriting {
	const format = timeFormatOf(locale);
	const words = dayPeriodWordsOf(locale, format);
	const textOf = (value: string) => {
		const minutes = minutesOfTimeValue(value);
		if (minutes === null) {
			return '';
		}
		return format.format(momentOfMinutes(minutes)).replace(DIRECTION_MARKS, '');
	};
	return {
		textOf,
		read: (text) => readTypedTime(text, words),
		placeholder: textOf(timeValueOf(EXAMPLE_MINUTES))
	};
}

function dayFormatOf(locale: FormatLocale) {
	return dateFormatOf(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'UTC',
		numberingSystem: 'latn',
		calendar: 'gregory'
	});
}

function exampleDayOf(year: number) {
	return new Date(Date.UTC(year, EXAMPLE_MONTH_INDEX, EXAMPLE_DAY));
}

function dayOrderOf(format: Intl.DateTimeFormat): DayField[] {
	const order = format
		.formatToParts(exampleDayOf(2000))
		.map((part) => part.type)
		.filter((type): type is DayField => type === 'year' || type === 'month' || type === 'day');
	return order.length === ISO_ORDER.length ? order : ISO_ORDER;
}

function daysInMonthOf(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The `YYYY-MM-DD` value of a typed day, its three numbers in the order the field writes them (`12/31/2026`,
 * `31.12.2026`), or year first (`2026-12-31`). The year takes four digits.
 */
function readTypedDay(text: string, order: DayField[]): string | null {
	const numbers = cleanTextOf(text).match(/\d+/g);
	if (numbers?.length !== ISO_ORDER.length) {
		return null;
	}
	const fields = numbers[0].length === 4 ? ISO_ORDER : order;
	const parts = new Map(fields.map((field, index) => [field, numbers[index]]));
	const yearText = parts.get('year') ?? '';
	const monthText = parts.get('month') ?? '';
	const dayText = parts.get('day') ?? '';
	if (yearText.length !== 4 || monthText.length > 2 || dayText.length > 2) {
		return null;
	}
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	if (month < 1 || month > MONTHS_PER_YEAR || day < 1 || day > daysInMonthOf(year, month)) {
		return null;
	}
	return `${yearText}-${twoDigits(month)}-${twoDigits(day)}`;
}

/** How a date field writes and reads a day: in the workspace's date format, else the reader's language's. */
export function dayWritingOf(locale: FormatLocale): FieldWriting {
	const format = dayFormatOf(locale);
	const order = dayOrderOf(format);
	const write = (date: Date) => format.format(date).replace(DIRECTION_MARKS, '');
	return {
		textOf: (value) => {
			const match = DAY_VALUE.exec(value);
			if (!match) {
				return '';
			}
			return write(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
		},
		read: (text) => readTypedDay(text, order),
		placeholder: write(exampleDayOf(new Date().getFullYear()))
	};
}
