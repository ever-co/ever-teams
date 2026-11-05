import moment from 'moment';
import { getDailyPlanDay } from './daily-plan-day';

/**
 * Local midnight of the calendar day a date stands for. A 'YYYY-MM-DD' string, or a plan date stored at UTC
 * midnight, keeps its date; any other instant takes its day in the user's time zone.
 */
const getLocalDayStart = (date: Date): Date => {
	const day = getDailyPlanDay(date);
	const localMidnight = moment(day, 'YYYY-MM-DD');

	return localMidnight.toDate();
};

// ─── Days of a named time zone ──────────────────────────────────────────────
// Intl rather than moment-timezone: this module is on the timer's path, and moment-timezone ships every zone's data.

const wallClockFormatters = new Map<string, Intl.DateTimeFormat | null>();

/** A formatter of the wall-clock fields in `timeZone`, or null when the runtime does not know the zone. */
function wallClockFormatter(timeZone: string | null | undefined): Intl.DateTimeFormat | null {
	const zone = timeZone?.trim();
	if (!zone) return null;
	if (!wallClockFormatters.has(zone)) {
		let formatter: Intl.DateTimeFormat | null;
		try {
			formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: zone,
				hourCycle: 'h23',
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			});
		} catch {
			formatter = null;
		}
		wallClockFormatters.set(zone, formatter);
	}
	return wallClockFormatters.get(zone) ?? null;
}

/** The wall clock `instant` shows in the formatter's zone, read as if it were UTC (ms, whole seconds). */
function wallClockAsUtc(formatter: Intl.DateTimeFormat, instant: number): number {
	const parts = formatter.formatToParts(new Date(instant));
	const field = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
	return Date.UTC(
		field('year'),
		field('month') - 1,
		field('day'),
		field('hour') % 24,
		field('minute'),
		field('second')
	);
}

/** The 'YYYY-MM-DD' day `instant` falls on in the formatter's zone. */
function dayInZone(formatter: Intl.DateTimeFormat, instant: number): string {
	return new Date(wallClockAsUtc(formatter, instant)).toISOString().slice(0, 10);
}

/** The day after a 'YYYY-MM-DD' day. */
function nextDay(day: string): string {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/**
 * The first instant of a 'YYYY-MM-DD' day in the formatter's zone: its midnight, or the first instant after it when
 * the clocks skip midnight (that day then starts at 01:00), the earlier one when they repeat it.
 */
function zoneDayStart(formatter: Intl.DateTimeFormat, day: string): number {
	const [year, month, date] = day.split('-').map(Number);
	const wallMidnight = Date.UTC(year, month - 1, date);
	const offsetAt = (instant: number) => wallClockAsUtc(formatter, instant) - Math.floor(instant / 1000) * 1000;
	const first = wallMidnight - offsetAt(wallMidnight);
	const second = wallMidnight - offsetAt(first);
	const onTheDay = [first, second].filter((instant) => dayInZone(formatter, instant) === day);
	return onTheDay.length > 0 ? Math.min(...onTheDay) : Math.min(first, second);
}

/**
 * Start (00:00) in `timeZone` of the calendar day `date` stands for, as an ISO instant; null when the zone is unknown.
 *
 * The day is the one the date stands for in the app (getDailyPlanDay: a 'YYYY-MM-DD' string or a UTC-midnight plan
 * date keeps its date, a picked day's browser midnight its browser day); only its bounds are taken in `timeZone`.
 */
export function startOfDayInTimeZone(date: string | Date, timeZone: string | null | undefined): string | null {
	const formatter = wallClockFormatter(timeZone);
	const instant = new Date(date);
	if (!formatter || Number.isNaN(instant.getTime())) return null;
	return new Date(zoneDayStart(formatter, getDailyPlanDay(instant))).toISOString();
}

/** End (1 ms before the next midnight) in `timeZone` of the day `date` stands for; null when the zone is unknown. */
export function endOfDayInTimeZone(date: string | Date, timeZone: string | null | undefined): string | null {
	const formatter = wallClockFormatter(timeZone);
	const instant = new Date(date);
	if (!formatter || Number.isNaN(instant.getTime())) return null;
	const followingDay = nextDay(getDailyPlanDay(instant));
	return new Date(zoneDayStart(formatter, followingDay) - 1).toISOString();
}

/**
 * Formats date range to handle same-day queries correctly
 *
 * The API filters on these exact instants and lists their days in the request's `timeZone`, so both ends are the
 * bounds of the days in that zone: pass the zone the request sends. Without one (or with a zone the runtime does not
 * know), the days are the browser's.
 *
 * @param startDate - Start date (string or Date)
 * @param endDate - End date (string or Date)
 * @param timeZone - The IANA zone the request sends as `timeZone` (optional)
 * @returns Object with formatted start and end dates
 */
export function formatStartAndEndDateRange(
	startDate: string | Date,
	endDate: string | Date,
	timeZone?: string | null
): { start: string; end: string } {
	// Parse dates to ensure they are valid Date objects
	const startDateObj = new Date(startDate);
	const endDateObj = new Date(endDate);

	// Validate that dates are valid
	if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
		throw new Error('Invalid date provided. Both startDate and endDate must be valid dates.');
	}

	const zonedStart = startOfDayInTimeZone(startDateObj, timeZone);
	const zonedEnd = endOfDayInTimeZone(endDateObj, timeZone);
	if (zonedStart && zonedEnd) {
		return { start: zonedStart, end: zonedEnd };
	}

	// Format start date to beginning of the local day (00:00:00.000)
	const startOfDay = getLocalDayStart(startDateObj);
	const start = startOfDay.toISOString();

	// Format end date to end of the local day, 1 ms before the next local midnight (also on DST change days)
	const lastDayStart = getLocalDayStart(endDateObj);
	const endOfLastDay = moment(lastDayStart).endOf('day');
	const end = endOfLastDay.toISOString();

	return { start, end };
}
