/**
 * The values the app's date and time fields show (#5318): since #5325 they write a day and a time the way the reader's
 * language does, and the browser gate reads in English: `11/16/2026` and `2:30 PM`. A day or a time typed as the
 * native fields took them (`2026-11-16`, `14:30`) still reads.
 */

const TYPED_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ENGLISH_DAY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
// Between the minutes and AM or PM the runtime puts a space, a no-break space or a narrow no-break space
const SHOWN_TIME = /^(\d{1,2}):(\d{2})(?:[\s\u00a0\u202f]*([AP])\.?M\.?)?$/i;

/** The day a date field shows, as `[year, month, day]`, or null when it is neither form. */
function dayPartsOf(text: string): [number, number, number] | null {
	const typed = TYPED_DAY.exec(text);
	if (typed) {
		return [Number(typed[1]), Number(typed[2]), Number(typed[3])];
	}
	const english = ENGLISH_DAY.exec(text);
	if (english) {
		return [Number(english[3]), Number(english[1]), Number(english[2])];
	}
	return null;
}

/** The time a time field shows, as minutes after midnight, or null when it is neither form. */
function minutesOf(text: string): number | null {
	const match = SHOWN_TIME.exec(text);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const period = match[3]?.toUpperCase();
	if (period === undefined) {
		return hours * 60 + minutes;
	}
	// 12 AM is midnight, 12 PM noon
	return ((hours % 12) + (period === 'P' ? 12 : 0)) * 60 + minutes;
}

/**
 * The moment a date field and a time field show, on the clocks of UTC (the zone the fixture user's meetings are
 * scheduled in). It throws on a text it cannot read, so a field that changes its writing fails loudly here rather than
 * as an Invalid Date that sends the agenda to another day.
 */
export function shownMomentOf(dayText: string, timeText: string): Date {
	const day = dayPartsOf(dayText.trim());
	const minutes = minutesOf(timeText.trim());
	if (!day || minutes === null) {
		throw new Error(`Cannot read the date "${dayText}" and the time "${timeText}" the fields show`);
	}
	const [year, month, date] = day;
	return new Date(Date.UTC(year, month - 1, date, Math.floor(minutes / 60), minutes % 60));
}
