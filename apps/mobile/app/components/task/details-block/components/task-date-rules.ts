import moment from 'moment-timezone';

export type TaskDateKind = 'start' | 'due';
export type DatePreset = 'today' | 'tomorrow' | 'endOfWeek' | 'inOneWeek';

/** The web's quick picks, in its order. */
export const DATE_PRESETS: DatePreset[] = ['today', 'tomorrow', 'endOfWeek', 'inOneWeek'];

const FRIDAY = 5;
const DAYS_IN_WEEK = 7;
const SAME_YEAR: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
const OTHER_YEAR: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** Days from today to this week's Friday, or the next one once it has passed. */
function daysUntilFriday(today: moment.Moment): number {
	const weekday = today.isoWeekday();
	if (weekday <= FRIDAY) {
		return FRIDAY - weekday;
	}
	return DAYS_IN_WEEK - weekday + FRIDAY;
}

/** The day a quick pick names, from today: tomorrow, this week's Friday, or a week on. */
export function presetDayOf(preset: DatePreset, now: Date = new Date()): Date {
	const today = moment(now).startOf('day');
	if (preset === 'tomorrow') {
		return today.add(1, 'day').toDate();
	}
	if (preset === 'endOfWeek') {
		return today.add(daysUntilFriday(today), 'day').toDate();
	}
	if (preset === 'inOneWeek') {
		return today.add(DAYS_IN_WEEK, 'day').toDate();
	}
	return today.toDate();
}

/** A picked day as the task page has always sent it: the day's local midnight, in ISO. */
export function storedDateOf(day: Date): string {
	return moment(day).startOf('day').toISOString();
}

/** The day a stored date names on the phone's calendar; nothing for none, or for one that does not read. */
export function dayOfStoredDate(stored: string | null | undefined): Date | null {
	if (!stored) {
		return null;
	}
	const day = moment(stored);
	if (!day.isValid()) {
		return null;
	}
	return day.startOf('day').toDate();
}

/** A day as the calendar names it: `2026-11-20`. */
export function calendarDayOf(day: Date): string {
	return moment(day).format('YYYY-MM-DD');
}

/**
 * Whether a picked day may go with the task's other date, compared as days: a start not after the due day, a due day
 * not before the start. Either is free while the other date is not set.
 */
export function acceptsDayFor(kind: TaskDateKind, day: Date, otherDate: string | null | undefined): boolean {
	const other = dayOfStoredDate(otherDate);
	if (!other) {
		return true;
	}
	if (kind === 'start') {
		return !moment(day).isAfter(other, 'day');
	}
	return !moment(day).isBefore(other, 'day');
}

/** A day as the web's date field reads it: with its weekday this year (`Fri, 20 Nov`), with its year in another. */
export function shortDayOf(day: Date, locale?: string, now: Date = new Date()): string {
	const isThisYear = day.getFullYear() === now.getFullYear();
	if (isThisYear) {
		return day.toLocaleDateString(locale, SAME_YEAR);
	}
	return day.toLocaleDateString(locale, OTHER_YEAR);
}
