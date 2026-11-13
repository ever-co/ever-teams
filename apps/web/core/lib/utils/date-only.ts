/**
 * Due dates name a calendar day. The platform stores such a day in its date-only form, midnight UTC of that day (as
 * its integrations write a provider's day and its own bulk toolbar writes a picked day), and a bare `YYYY-MM-DD` means
 * the same. Every reader shows that day whatever its own zone. Any other value is a moment, read as the reader's
 * calendar day of that moment.
 *
 * Days are counted as whole numbers of days from a fixed epoch, so two days subtract to a whole number whatever the
 * daylight-saving changes in between.
 */

const DAY_MS = 86_400_000;

const BARE_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar day of the reader, as a whole number of days. */
export function dayNumberOf(date: Date): number {
	return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** The local midnight of a day number: the day as the reader's calendar and date formatters show it. */
export function dateOfDayNumber(day: number): Date {
	const utc = new Date(day * DAY_MS);
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** The platform's date-only form of a day number: midnight UTC of that day. */
export function dateOnlyOfDayNumber(day: number): Date {
	return new Date(day * DAY_MS);
}

/**
 * The platform's date-only form of the day a picker gives (a day of the reader's calendar, usually its local
 * midnight): midnight UTC of that calendar day. `toISOString()` of the local midnight would be the day before for a
 * reader east of UTC, and the evening before for every reader west of it.
 */
export function dateOnlyOf(day: Date): Date {
	return dateOnlyOfDayNumber(dayNumberOf(day));
}

/**
 * A stored date as a day number. A bare `YYYY-MM-DD` and a date at midnight UTC name a day (the way a due date is
 * stored): that day, whatever the reader's zone. Any other moment is the reader's calendar day of that moment.
 */
export function dayOfStoredDate(value: Date | string | null | undefined): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	if (typeof value === 'string') {
		const bare = BARE_DAY.exec(value);
		if (bare) {
			return Math.round(Date.UTC(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3])) / DAY_MS);
		}
	}
	const date = value instanceof Date ? value : new Date(value);
	const time = date.getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	const isUtcMidnight =
		date.getUTCHours() === 0 &&
		date.getUTCMinutes() === 0 &&
		date.getUTCSeconds() === 0 &&
		date.getUTCMilliseconds() === 0;
	if (isUtcMidnight) {
		return Math.round(time / DAY_MS);
	}
	return dayNumberOf(date);
}

/**
 * A stored date as the day a reader is shown: the local midnight of the day it names (see `dayOfStoredDate`), so a
 * date formatter, a calendar's selected day and a comparison of days all read the day that was picked. Null for no
 * date or one that cannot be read.
 */
export function shownDayOf(value: Date | string | null | undefined): Date | null {
	const day = dayOfStoredDate(value);
	return day === null ? null : dateOfDayNumber(day);
}
