import {
	addDays,
	addMonths,
	differenceInCalendarDays,
	eachDayOfInterval,
	endOfDay,
	endOfMonth,
	endOfWeek,
	isAfter,
	isBefore,
	isSameDay,
	isSameYear,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths
} from 'date-fns';

export interface Period {
	from: Date;
	to: Date;
}

export type PeriodPresetKey =
	| 'today'
	| 'yesterday'
	| 'thisWeek'
	| 'lastWeek'
	| 'last7Days'
	| 'last14Days'
	| 'thisMonth'
	| 'lastMonth';

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_PERIOD_PRESETS: ReadonlyArray<PeriodPresetKey> = [
	'today',
	'yesterday',
	'thisWeek',
	'lastWeek',
	'last7Days',
	'last14Days',
	'thisMonth',
	'lastMonth'
];

function weekOf(date: Date, weekStartsOn: WeekStart): Period {
	return { from: startOfWeek(date, { weekStartsOn }), to: endOfWeek(date, { weekStartsOn }) };
}

function monthOf(date: Date): Period {
	return { from: startOfMonth(date), to: endOfMonth(date) };
}

function dayOf(date: Date): Period {
	return { from: startOfDay(date), to: endOfDay(date) };
}

export function periodOfPreset(key: PeriodPresetKey, weekStartsOn: WeekStart, now = new Date()): Period {
	switch (key) {
		case 'today':
			return dayOf(now);
		case 'yesterday':
			return dayOf(subDays(now, 1));
		case 'thisWeek':
			return weekOf(now, weekStartsOn);
		case 'lastWeek':
			return weekOf(subDays(now, 7), weekStartsOn);
		case 'last7Days':
			return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
		case 'last14Days':
			return { from: startOfDay(subDays(now, 13)), to: endOfDay(now) };
		case 'thisMonth':
			return monthOf(now);
		case 'lastMonth':
			return monthOf(subMonths(now, 1));
	}
}

export function isSamePeriod(first: Period, second: Period) {
	const isSameStart = isSameDay(first.from, second.from);
	const isSameEnd = isSameDay(first.to, second.to);
	return isSameStart && isSameEnd;
}

export function presetOfPeriod(
	period: Period,
	presets: ReadonlyArray<PeriodPresetKey>,
	weekStartsOn: WeekStart
): PeriodPresetKey | null {
	const match = presets.find((key) => isSamePeriod(periodOfPreset(key, weekStartsOn), period));
	return match ?? null;
}

function isWholeMonth(period: Period) {
	const startsOnFirst = isSameDay(period.from, startOfMonth(period.from));
	const endsOnLast = isSameDay(period.to, endOfMonth(period.from));
	return startsOnFirst && endsOnLast;
}

/** The previous or next period of the same shape: a month steps by month, anything else by its own length. */
export function shiftPeriod(period: Period, direction: 1 | -1): Period {
	if (isWholeMonth(period)) {
		const month = addMonths(period.from, direction);
		return monthOf(month);
	}
	const length = differenceInCalendarDays(period.to, period.from) + 1;
	const offset = length * direction;
	return { from: startOfDay(addDays(period.from, offset)), to: endOfDay(addDays(period.to, offset)) };
}

export function daysOfPeriod(period: Period): Date[] {
	return eachDayOfInterval({ start: startOfDay(period.from), end: startOfDay(period.to) });
}

export function periodLengthInDays(period: Period) {
	return differenceInCalendarDays(period.to, period.from) + 1;
}

/** "Nov 3", "Nov 3 – 9", "Oct 27 – Nov 2", "Dec 29, 2025 – Jan 4, 2026", in the reader's locale. */
export function formatPeriod(period: Period, locale: string): string {
	const sameDay = isSameDay(period.from, period.to);
	const sameYear = isSameYear(period.from, period.to);
	const isCurrentYear = isSameYear(period.from, new Date());
	const showsYear = !sameYear || !isCurrentYear;
	const dayFormat = new Intl.DateTimeFormat(locale, yearFormatOptions(showsYear));
	if (sameDay) {
		return dayFormat.format(period.from);
	}
	return dayFormat.formatRange(period.from, period.to);
}

function yearFormatOptions(showsYear: boolean): Intl.DateTimeFormatOptions {
	if (showsYear) {
		return { month: 'short', day: 'numeric', year: 'numeric' };
	}
	return { month: 'short', day: 'numeric' };
}

/** Today when the period holds it, otherwise the period's last day: where a one-day view of the period opens. */
export function defaultDayOfPeriod(period: Period, now: Date) {
	const first = startOfDay(period.from);
	const last = startOfDay(period.to);
	const today = startOfDay(now);
	const isBeforePeriod = isBefore(today, first);
	const isAfterPeriod = isAfter(today, last);
	const isOutside = isBeforePeriod || isAfterPeriod;
	if (isOutside) {
		return last;
	}
	return today;
}

export function clampedDayOfPeriod(day: Date, period: Period) {
	const first = startOfDay(period.from);
	const last = startOfDay(period.to);
	if (isBefore(day, first)) {
		return first;
	}
	if (isAfter(day, last)) {
		return last;
	}
	return startOfDay(day);
}
