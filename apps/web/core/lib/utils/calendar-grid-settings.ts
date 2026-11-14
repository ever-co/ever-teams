import { type CalendarDay, HOURS_IN_DAY, MINUTES_IN_DAY, minuteOfDay } from './calendar-view';

const MINUTES_PER_HOUR = 60;

/** The steps a drag in the week and day grids snaps to, in minutes. */
export const SNAP_STEP_OPTIONS = [1, 5, 10, 15, 30, 60] as const;

export type SnapStepMinutes = (typeof SNAP_STEP_OPTIONS)[number];

export const ROW_HEIGHT_OPTIONS = ['compact', 'default', 'tall'] as const;

export type CalendarRowHeight = (typeof ROW_HEIGHT_OPTIONS)[number];

/** How a person likes the week and day grids drawn: kept in their browser, never sent anywhere. */
export interface CalendarGridSettings {
	snapMinutes: SnapStepMinutes;
	/** The first hour drawn, 0 to 23. */
	firstHour: number;
	/** The hour the grid ends at, 1 to 24, after the first one. */
	lastHour: number;
	rowHeight: CalendarRowHeight;
}

export const DEFAULT_CALENDAR_GRID_SETTINGS: CalendarGridSettings = {
	snapMinutes: 15,
	firstHour: 0,
	lastHour: HOURS_IN_DAY,
	rowHeight: 'default'
};

const HOUR_HEIGHTS_PX: Record<CalendarRowHeight, number> = {
	compact: 32,
	default: 48,
	tall: 72
};

/** The part of a day the grid draws, in minutes from midnight. */
export interface GridWindow {
	firstMinute: number;
	lastMinute: number;
}

export type GridHourEdge = 'top' | 'inside' | 'bottom';

export interface GridHourLabel {
	hour: number;
	edge: GridHourEdge;
}

export function hourHeightOf(rowHeight: CalendarRowHeight) {
	return HOUR_HEIGHTS_PX[rowHeight];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function snapStepOf(value: unknown): SnapStepMinutes {
	const step = SNAP_STEP_OPTIONS.find((option) => option === value);
	return step ?? DEFAULT_CALENDAR_GRID_SETTINGS.snapMinutes;
}

function rowHeightOf(value: unknown): CalendarRowHeight {
	const rowHeight = ROW_HEIGHT_OPTIONS.find((option) => option === value);
	return rowHeight ?? DEFAULT_CALENDAR_GRID_SETTINGS.rowHeight;
}

function isWholeHour(value: unknown, lowest: number, highest: number): value is number {
	const isWholeNumber = typeof value === 'number' && Number.isInteger(value);
	if (!isWholeNumber) {
		return false;
	}
	return value >= lowest && value <= highest;
}

/** The hours of a stored choice, or the whole day when they do not make a range a grid can draw. */
function hoursOf(firstValue: unknown, lastValue: unknown) {
	const isFirstHour = isWholeHour(firstValue, 0, HOURS_IN_DAY - 1);
	const isLastHour = isWholeHour(lastValue, 1, HOURS_IN_DAY);
	const isRange = isFirstHour && isLastHour && firstValue < lastValue;
	if (!isRange) {
		return {
			firstHour: DEFAULT_CALENDAR_GRID_SETTINGS.firstHour,
			lastHour: DEFAULT_CALENDAR_GRID_SETTINGS.lastHour
		};
	}
	return { firstHour: firstValue, lastHour: lastValue };
}

/** The settings a browser holds, each value it cannot use replaced by its default. */
export function calendarGridSettingsOf(stored: unknown): CalendarGridSettings {
	if (!isRecord(stored)) {
		return DEFAULT_CALENDAR_GRID_SETTINGS;
	}
	const hours = hoursOf(stored.firstHour, stored.lastHour);
	return {
		snapMinutes: snapStepOf(stored.snapMinutes),
		firstHour: hours.firstHour,
		lastHour: hours.lastHour,
		rowHeight: rowHeightOf(stored.rowHeight)
	};
}

function hourFlooredMinute(minute: number) {
	const hour = Math.floor(minute / MINUTES_PER_HOUR);
	return hour * MINUTES_PER_HOUR;
}

function hourRaisedMinute(minute: number) {
	const hour = Math.ceil(minute / MINUTES_PER_HOUR);
	return hour * MINUTES_PER_HOUR;
}

/**
 * The part of the day the grid draws: the chosen hours, widened to the whole hours of any entry of the shown days
 * that starts before them or ends after them, so a setting never hides recorded time.
 */
export function gridWindowOf(days: ReadonlyArray<CalendarDay>, settings: CalendarGridSettings): GridWindow {
	let firstMinute = settings.firstHour * MINUTES_PER_HOUR;
	let lastMinute = settings.lastHour * MINUTES_PER_HOUR;
	for (const day of days) {
		for (const entry of day.entries) {
			const startMinute = minuteOfDay(entry.start, day.date);
			const endMinute = minuteOfDay(entry.end, day.date);
			firstMinute = Math.min(firstMinute, hourFlooredMinute(startMinute));
			lastMinute = Math.max(lastMinute, hourRaisedMinute(endMinute));
		}
	}
	return { firstMinute, lastMinute: Math.min(lastMinute, MINUTES_IN_DAY) };
}

/**
 * The hours the gutter names: every inner hour line, plus the first and the last hour of a window shorter than the
 * day, drawn at its top and bottom edges so the window says where it starts and ends.
 */
export function gridHourLabelsOf(window: GridWindow): GridHourLabel[] {
	const firstHour = Math.round(window.firstMinute / MINUTES_PER_HOUR);
	const lastHour = Math.round(window.lastMinute / MINUTES_PER_HOUR);
	const labels: GridHourLabel[] = [];
	const startsAfterMidnight = firstHour > 0;
	if (startsAfterMidnight) {
		labels.push({ hour: firstHour, edge: 'top' });
	}
	for (let hour = firstHour + 1; hour < lastHour; hour++) {
		labels.push({ hour, edge: 'inside' });
	}
	const endsBeforeMidnight = lastHour < HOURS_IN_DAY;
	if (endsBeforeMidnight) {
		labels.push({ hour: lastHour, edge: 'bottom' });
	}
	return labels;
}

/** Pixels from the top of the window to a minute of the day. */
export function gridOffsetOfMinute(minute: number, window: GridWindow, hourHeightPx: number) {
	const minutesFromTop = minute - window.firstMinute;
	return (minutesFromTop / MINUTES_PER_HOUR) * hourHeightPx;
}

/** The minute of the day a pointer offset from the top of the window stands for, kept inside the window. */
export function gridMinuteAtOffset(offsetPx: number, window: GridWindow, hourHeightPx: number) {
	const minutesFromTop = (offsetPx / hourHeightPx) * MINUTES_PER_HOUR;
	const minute = window.firstMinute + minutesFromTop;
	const notBeforeWindow = Math.max(minute, window.firstMinute);
	return Math.min(notBeforeWindow, window.lastMinute);
}

export function gridHeightOf(window: GridWindow, hourHeightPx: number) {
	const minutes = window.lastMinute - window.firstMinute;
	return (minutes / MINUTES_PER_HOUR) * hourHeightPx;
}
