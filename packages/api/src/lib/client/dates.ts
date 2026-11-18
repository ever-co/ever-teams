import { clientError } from './error-mapping';

/** A day as YYYY-MM-DD (that whole day in the time zone the code runs in), a Date, or an ISO date-time. */
export type EverTeamsDate = string | Date;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const invalidDate = (value: unknown) =>
	clientError(
		'INVALID_DATE',
		`${String(value)} is not a date.`,
		'Pass a day as YYYY-MM-DD, a Date, or an ISO date-time.'
	);

// The local day a YYYY-MM-DD names, at the given time of day; null for another text.
function localDay(text: string, hours: number, minutes: number, seconds: number, milliseconds: number): Date | null {
	const match = DAY.exec(text);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
	// 2026-02-31 would roll over to March
	if (date.getMonth() !== month) {
		throw invalidDate(text);
	}
	return date;
}

function instantOf(value: EverTeamsDate): Date {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw invalidDate(value);
	}
	return date;
}

/** The start of a range: the first instant of a YYYY-MM-DD, else the instant given. */
export function startOf(value: EverTeamsDate): Date {
	if (typeof value === 'string') {
		const day = localDay(value, 0, 0, 0, 0);
		if (day) {
			return day;
		}
	}
	return instantOf(value);
}

/** The end of a range: the last instant of a YYYY-MM-DD, else the instant given. */
export function endOf(value: EverTeamsDate): Date {
	if (typeof value === 'string') {
		const day = localDay(value, 23, 59, 59, 999);
		if (day) {
			return day;
		}
	}
	return instantOf(value);
}

/** From the start of `from` to the end of `to`, refused when it ends before it starts. */
export function rangeOf(from: EverTeamsDate, to: EverTeamsDate): { start: Date; end: Date } {
	const start = startOf(from);
	const end = endOf(to);
	if (end.getTime() < start.getTime()) {
		throw clientError(
			'INVALID_DATE',
			`${String(to)} is before ${String(from)}.`,
			'Pass a to that is not before from.'
		);
	}
	return { start, end };
}

/** Today, in the time zone the code runs in. */
export function todayRange(now: Date): { start: Date; end: Date } {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
	return { start, end };
}

/** This week, Monday to Sunday as the kit counts it, in the time zone the code runs in. */
export function weekRange(now: Date): { start: Date; end: Date } {
	const daysSinceMonday = (now.getDay() + 6) % 7;
	const monday = now.getDate() - daysSinceMonday;
	const start = new Date(now.getFullYear(), now.getMonth(), monday);
	const end = new Date(now.getFullYear(), now.getMonth(), monday + 6, 23, 59, 59, 999);
	return { start, end };
}

/** The IANA time zone the code runs in, when the platform tells it. */
export function localTimeZone(): string | undefined {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}
