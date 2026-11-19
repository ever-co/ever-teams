import { OptionValues, textOption } from './args.js';
import { UsageError } from './refusals.js';

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DURATION = /^(?:(\d+)h)?(?:(\d+)m)?$/;

export interface PastRange {
	start: Date;
	end: Date;
}

/** Midnight of a YYYY-MM-DD, in the time zone the command line runs in; a day the calendar lacks is refused. */
export function localDayOf(text: string, option: string): Date {
	const match = DAY.exec(text);
	if (!match) {
		throw new UsageError(`${option} takes a day as YYYY-MM-DD, such as 2026-11-18.`);
	}
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(0);
	// setFullYear, not the Date constructor, which reads the years 0 to 99 as 1900 to 1999.
	date.setFullYear(year, month, day);
	date.setHours(0, 0, 0, 0);
	const sameMonth = date.getMonth() === month;
	const sameDay = date.getDate() === day;
	if (!sameMonth || !sameDay) {
		throw new UsageError(`${option} ${text} is not a day of the calendar.`);
	}
	return date;
}

function atClock(day: Date, text: string, option: string): Date {
	const match = CLOCK.exec(text);
	if (!match) {
		throw new UsageError(`${option} takes a time as HH:MM, such as 09:30.`);
	}
	const date = new Date(day);
	date.setHours(Number(match[1]), Number(match[2]), 0, 0);
	return date;
}

function durationOf(text: string): number {
	const usage = '--duration takes hours and minutes, such as 1h30m, 2h or 45m.';
	const match = DURATION.exec(text);
	if (!match) {
		throw new UsageError(usage);
	}
	const [, hours, minutes] = match;
	if (hours === undefined && minutes === undefined) {
		throw new UsageError(usage);
	}
	const totalMinutes = Number(hours ?? 0) * 60 + Number(minutes ?? 0);
	if (totalMinutes === 0) {
		throw new UsageError('--duration must be longer than 0m.');
	}
	return totalMinutes * 60 * 1000;
}

function fromTo(day: Date, from: string | undefined, to: string | undefined): PastRange {
	if (from === undefined || to === undefined) {
		throw new UsageError('Give --from and --to, or --duration.');
	}
	const start = atClock(day, from, '--from');
	const end = atClock(day, to, '--to');
	if (end.getTime() <= start.getTime()) {
		throw new UsageError('--to must be after --from, on the same day.');
	}
	return { start, end };
}

interface DurationGiven {
	day: Date;
	hasDate: boolean;
	from: string | undefined;
	to: string | undefined;
	milliseconds: number;
}

// With --from it starts then; with --to it ends then; alone it ends now.
function withDuration(given: DurationGiven, now: Date): PastRange {
	const { day, from, to, milliseconds } = given;
	if (from !== undefined && to !== undefined) {
		throw new UsageError('Give --duration with --from or with --to, not with both.');
	}
	if (from !== undefined) {
		const start = atClock(day, from, '--from');
		return { start, end: new Date(start.getTime() + milliseconds) };
	}
	if (to !== undefined) {
		const end = atClock(day, to, '--to');
		return { start: new Date(end.getTime() - milliseconds), end };
	}
	if (given.hasDate) {
		throw new UsageError('With --date, give --from or --to as well.');
	}
	return { start: new Date(now.getTime() - milliseconds), end: now };
}

function dayGiven(date: string | undefined, now: Date): Date {
	if (date !== undefined) {
		return localDayOf(date, '--date');
	}
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	return today;
}

/**
 * The range of a past entry: --from and --to on --date (today by default), or --duration with --from, with --to,
 * or alone, ending now.
 */
export function pastRangeOf(values: OptionValues, now: Date): PastRange {
	const from = textOption(values, 'from');
	const to = textOption(values, 'to');
	const date = textOption(values, 'date');
	const duration = textOption(values, 'duration');
	const day = dayGiven(date, now);
	if (duration === undefined) {
		return fromTo(day, from, to);
	}
	const milliseconds = durationOf(duration);
	return withDuration({ day, hasDate: date !== undefined, from, to, milliseconds }, now);
}
