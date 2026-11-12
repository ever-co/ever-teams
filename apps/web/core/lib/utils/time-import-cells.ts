const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const NOON_HOUR = 12;
const LAST_HOUR = 23;
const LAST_MINUTE = 59;

export interface CalendarDay {
	year: number;
	/** 1 for January. */
	month: number;
	day: number;
}

export interface ClockTime {
	hours: number;
	minutes: number;
	seconds: number;
}

/**
 * Year first only: `03/11/2026` reads as two different days depending on who wrote it, and a guess would put the
 * time on the wrong day without anyone noticing.
 */
const DATE_PATTERN = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/;

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?m\.?)?$/i;

const CLOCK_DURATION_PATTERN = /^(\d{1,3}):(\d{2})(?::(\d{2}))?$/;

const UNIT_DURATION_PATTERN = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i;

const DECIMAL_HOURS_PATTERN = /^(\d+(?:[.,]\d+)?)\s*h?$/i;

const YES_WORDS: ReadonlySet<string> = new Set(['yes', 'y', 'true', '1']);

const NO_WORDS: ReadonlySet<string> = new Set(['no', 'n', 'false', '0']);

function numberOrZero(digits: string | undefined): number {
	if (!digits) {
		return 0;
	}
	return Number(digits);
}

function existsInCalendar({ year, month, day }: CalendarDay): boolean {
	const date = new Date(year, month - 1, day);
	const isSameYear = date.getFullYear() === year;
	const isSameMonth = date.getMonth() === month - 1;
	const isSameDay = date.getDate() === day;
	return isSameYear && isSameMonth && isSameDay;
}

export function calendarDayOf(text: string): CalendarDay | null {
	const match = DATE_PATTERN.exec(text.trim());
	if (!match) {
		return null;
	}
	const calendarDay: CalendarDay = { year: Number(match[1]), month: Number(match[3]), day: Number(match[4]) };
	if (!existsInCalendar(calendarDay)) {
		return null;
	}
	return calendarDay;
}

/** The hour of a 12-hour clock on the 24-hour one: 12 AM is 0, 12 PM stays 12. */
function hoursOfMeridiem(hours: number, meridiem: string): number | null {
	const isOnTwelveHourClock = hours >= 1 && hours <= NOON_HOUR;
	if (!isOnTwelveHourClock) {
		return null;
	}
	const isAfternoon = meridiem.toLowerCase() === 'p';
	const hoursPastNoon = hours % NOON_HOUR;
	if (isAfternoon) {
		return hoursPastNoon + NOON_HOUR;
	}
	return hoursPastNoon;
}

/** `09:30`, `9:30`, `17:05:30`, `9:30 AM`, `5:05pm`; null for anything else. */
export function clockTimeOf(text: string): ClockTime | null {
	const match = CLOCK_PATTERN.exec(text.trim());
	if (!match) {
		return null;
	}
	const typedHours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = numberOrZero(match[3]);
	const meridiem = match[4];
	const hasValidMinutes = minutes <= LAST_MINUTE;
	const hasValidSeconds = seconds <= LAST_MINUTE;
	if (!hasValidMinutes || !hasValidSeconds) {
		return null;
	}
	if (meridiem) {
		const hours = hoursOfMeridiem(typedHours, meridiem);
		if (hours === null) {
			return null;
		}
		return { hours, minutes, seconds };
	}
	if (typedHours > LAST_HOUR) {
		return null;
	}
	return { hours: typedHours, minutes, seconds };
}

function clockDurationOf(text: string): number | null {
	const match = CLOCK_DURATION_PATTERN.exec(text);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = numberOrZero(match[3]);
	const hasValidMinutes = minutes <= LAST_MINUTE;
	const hasValidSeconds = seconds <= LAST_MINUTE;
	if (!hasValidMinutes || !hasValidSeconds) {
		return null;
	}
	return hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds;
}

function unitDurationOf(text: string): number | null {
	const match = UNIT_DURATION_PATTERN.exec(text);
	if (!match) {
		return null;
	}
	const hasHours = match[1] !== undefined;
	const hasMinutes = match[2] !== undefined;
	if (!hasHours && !hasMinutes) {
		return null;
	}
	const hours = numberOrZero(match[1]);
	const minutes = numberOrZero(match[2]);
	return hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE;
}

function decimalHoursOf(text: string): number | null {
	const match = DECIMAL_HOURS_PATTERN.exec(text);
	if (!match) {
		return null;
	}
	const hours = Number(match[1].replace(',', '.'));
	return Math.round(hours * SECONDS_PER_HOUR);
}

/**
 * A duration in seconds: `1:30` (hours and minutes), `1:30:00`, `1h 30m`, `2h`, `45m`, or hours as a number
 * (`1.5`, `1,5`, `1.5h`). A bare number is always hours, never minutes. Null for anything else.
 */
export function durationSecondsOf(text: string): number | null {
	const typed = text.trim();
	if (!typed) {
		return null;
	}
	const fromClock = clockDurationOf(typed);
	if (fromClock !== null) {
		return fromClock;
	}
	const fromUnits = unitDurationOf(typed);
	if (fromUnits !== null) {
		return fromUnits;
	}
	return decimalHoursOf(typed);
}

export function yesNoOf(text: string): boolean | null {
	const word = text.trim().toLowerCase();
	if (YES_WORDS.has(word)) {
		return true;
	}
	if (NO_WORDS.has(word)) {
		return false;
	}
	return null;
}
