/** One day of the yearly read: the hours as the calendar has always rounded them, and the raw seconds. */
export interface ActivityDayEntry {
	day: string;
	value: number;
	seconds: number;
}

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface YearDay {
	index: number;
	key: string;
	date: Date;
	month: number;
	seconds: number;
	level: ActivityLevel;
	isToday: boolean;
	isFuture: boolean;
	column: number;
	row: number;
}

export interface MonthColumn {
	month: number;
	column: number;
}

export interface YearLayout {
	year: number;
	days: YearDay[];
	leadingBlanks: number;
	columnCount: number;
	monthColumns: MonthColumn[];
}

export interface YearFigures {
	totalSeconds: number;
	activeDays: number;
	longestStreak: number;
	bestDay: YearDay | null;
}

export interface MonthSummary {
	month: number;
	seconds: number;
	activeDays: number;
	isAhead: boolean;
}

export const WEEKDAY_COUNT = 7;

/** A square of the grid and the gap after it, in pixels: the classes below draw 11px squares 3px apart. */
export const YEAR_CELL_PX = 11;

export const YEAR_STEP_PX = 14;

/** Steps of the brand hue by worked hours: none, under 2 h, 2 to 4 h, 4 to 8 h, 8 h and more. */
export const ACTIVITY_LEVEL_TONES = [
	'bg-foreground/[0.06]',
	'bg-primary/25',
	'bg-primary/45',
	'bg-primary/70',
	'bg-primary'
] as const;

export const YEAR_SURFACE_BODY = 'flex flex-col gap-5 p-4 sm:p-5';

/** Scrolls sideways on a phone; the bleed matches the room `AnimatedHeight` keeps around its content. */
export const YEAR_SCROLLER = '-mx-1 overflow-x-auto px-1 pt-1 pb-2';

export const YEAR_CELLS_GRID = 'grid grid-flow-col grid-rows-[repeat(7,11px)] auto-cols-[11px] gap-[3px]';

export const YEAR_CELL = 'block size-[11px] rounded-[3px]';

export const YEAR_WEEKDAY_COLUMN =
	'grid w-8 shrink-0 grid-rows-[repeat(7,11px)] gap-[3px] text-[10px] leading-[11px] text-muted-foreground';

/** The month labels start after the weekday column (w-8) and its gap (gap-1). */
export const YEAR_MONTH_LABELS = 'relative ml-9 h-4';

export const YEAR_FIGURES_LINE = 'grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap';

export const MONTH_ROW_GRID =
	'grid min-h-9 grid-cols-[minmax(0,1fr)_5rem_7rem] items-center gap-x-3 py-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_5rem_7rem]';

const HOURS_FOR_SECOND_LEVEL = 2;

const HOURS_FOR_THIRD_LEVEL = 4;

const HOURS_FOR_TOP_LEVEL = 8;

const MONTH_COUNT = 12;

export function activityLevelOf(hours: number): ActivityLevel {
	if (hours <= 0) {
		return 0;
	}
	if (hours < HOURS_FOR_SECOND_LEVEL) {
		return 1;
	}
	if (hours < HOURS_FOR_THIRD_LEVEL) {
		return 2;
	}
	if (hours < HOURS_FOR_TOP_LEVEL) {
		return 3;
	}
	return 4;
}

/** Monday first: Sunday, day 0 of `getUTCDay`, goes to the last row. */
function mondayRowOf(date: Date) {
	const sundayFirst = date.getUTCDay();
	const shifted = sundayFirst + WEEKDAY_COUNT - 1;
	return shifted % WEEKDAY_COUNT;
}

function dateKeyOf(date: Date) {
	const isoText = date.toISOString();
	return isoText.slice(0, 10);
}

function utcDayOf(year: number, dayOfYear: number) {
	const dayOfMonth = 1 + dayOfYear;
	const time = Date.UTC(year, 0, dayOfMonth);
	return new Date(time);
}

function isLeapYear(year: number) {
	const isFourthYear = year % 4 === 0;
	const isCentury = year % 100 === 0;
	const isFourthCentury = year % 400 === 0;
	if (isFourthCentury) {
		return true;
	}
	return isFourthYear && !isCentury;
}

function dayCountOf(year: number) {
	if (isLeapYear(year)) {
		return 366;
	}
	return 365;
}

function entriesByKeyOf(entries: ReadonlyArray<ActivityDayEntry>) {
	const byKey = new Map<string, ActivityDayEntry>();
	for (const entry of entries) {
		const existing = byKey.get(entry.day);
		if (!existing) {
			byKey.set(entry.day, entry);
			continue;
		}
		const value = existing.value + entry.value;
		const seconds = existing.seconds + entry.seconds;
		byKey.set(entry.day, { day: entry.day, value, seconds });
	}
	return byKey;
}

function monthColumnsOf(days: ReadonlyArray<YearDay>): MonthColumn[] {
	const firstDays = days.filter((day) => day.date.getUTCDate() === 1);
	return firstDays.map((day) => ({ month: day.month, column: day.column }));
}

/** Every day of the year on a Monday-first grid of week columns, with its time, its step and its place. */
export function yearLayoutOf(year: number, entries: ReadonlyArray<ActivityDayEntry>, todayKey: string): YearLayout {
	const byKey = entriesByKeyOf(entries);
	const firstDay = utcDayOf(year, 0);
	const leadingBlanks = mondayRowOf(firstDay);
	const dayCount = dayCountOf(year);
	const days: YearDay[] = [];
	for (let index = 0; index < dayCount; index += 1) {
		const date = utcDayOf(year, index);
		const key = dateKeyOf(date);
		const entry = byKey.get(key);
		const hours = entry?.value ?? 0;
		const position = leadingBlanks + index;
		const column = Math.floor(position / WEEKDAY_COUNT);
		days.push({
			index,
			key,
			date,
			month: date.getUTCMonth(),
			seconds: entry?.seconds ?? 0,
			level: activityLevelOf(hours),
			isToday: key === todayKey,
			isFuture: key > todayKey,
			column,
			row: position % WEEKDAY_COUNT
		});
	}
	const lastPosition = leadingBlanks + dayCount - 1;
	const lastColumn = Math.floor(lastPosition / WEEKDAY_COUNT);
	const columnCount = lastColumn + 1;
	const monthColumns = monthColumnsOf(days);
	return { year, days, leadingBlanks, columnCount, monthColumns };
}

function isBetterDay(day: YearDay, best: YearDay | null) {
	if (!best) {
		return true;
	}
	return day.seconds > best.seconds;
}

/** The figures of the year, from its days only: total, active days, longest run of active days, best day. */
export function yearFiguresOf(days: ReadonlyArray<YearDay>): YearFigures {
	let totalSeconds = 0;
	let activeDays = 0;
	let longestStreak = 0;
	let currentStreak = 0;
	let bestDay: YearDay | null = null;
	for (const day of days) {
		const isActive = day.seconds > 0;
		if (!isActive) {
			currentStreak = 0;
			continue;
		}
		totalSeconds += day.seconds;
		activeDays += 1;
		currentStreak += 1;
		longestStreak = Math.max(longestStreak, currentStreak);
		if (isBetterDay(day, bestDay)) {
			bestDay = day;
		}
	}
	return { totalSeconds, activeDays, longestStreak, bestDay };
}

export function monthSummariesOf(days: ReadonlyArray<YearDay>): MonthSummary[] {
	const summaries: MonthSummary[] = Array.from({ length: MONTH_COUNT }, (_, month) => ({
		month,
		seconds: 0,
		activeDays: 0,
		isAhead: false
	}));
	for (const day of days) {
		const summary = summaries[day.month];
		const isFirstOfMonth = day.date.getUTCDate() === 1;
		if (isFirstOfMonth) {
			summary.isAhead = day.isFuture;
		}
		const isActive = day.seconds > 0;
		if (!isActive) {
			continue;
		}
		summary.seconds += day.seconds;
		summary.activeDays += 1;
	}
	return summaries;
}

export function bestMonthSecondsOf(months: ReadonlyArray<MonthSummary>) {
	let best = 0;
	for (const month of months) {
		best = Math.max(best, month.seconds);
	}
	return best;
}

function partValueOf(parts: ReadonlyArray<Intl.DateTimeFormatPart>, type: Intl.DateTimeFormatPartTypes) {
	const part = parts.find((candidate) => candidate.type === type);
	return part?.value ?? '';
}

/** Today as `YYYY-MM-DD` in the member's time zone, the zone the yearly read is cut in. */
export function todayKeyIn(timeZone: string, now = new Date()): string {
	let format: Intl.DateTimeFormat;
	try {
		format = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
	} catch {
		format = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
	}
	const parts = format.formatToParts(now);
	const year = partValueOf(parts, 'year');
	const month = partValueOf(parts, 'month');
	const day = partValueOf(parts, 'day');
	return `${year}-${month}-${day}`;
}

/** The day to start from when the grid gets the keyboard: today, else the last day with time, else the first. */
export function startDayIndexOf(layout: YearLayout): number {
	const today = layout.days.find((day) => day.isToday);
	if (today) {
		return today.index;
	}
	const activeDays = layout.days.filter((day) => day.seconds > 0);
	const lastActive = activeDays[activeDays.length - 1];
	return lastActive?.index ?? 0;
}
