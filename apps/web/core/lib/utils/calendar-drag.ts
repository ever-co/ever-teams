import { addDays, startOfDay } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { MINUTES_IN_DAY, minuteOfDay } from './calendar-view';
import {
	busyWindowsOf,
	type DayBounds,
	dayBoundsOf,
	freeWindowsBetween,
	placementLimitOf,
	type TimeWindow
} from './dashboards/timesheet-sheet-edit';

/** A drag in the week and day grids lands on quarter hours. */
export const DRAG_STEP_MINUTES = 15;

const MINUTES_PER_HOUR = 60;

const MILLISECONDS_PER_MINUTE = 60_000;

const EDGE_SCROLL_ZONE_PX = 36;

const EDGE_SCROLL_STEP_PX = 14;

export interface MinuteRange {
	startMinute: number;
	endMinute: number;
}

export interface HorizontalSpan {
	left: number;
	right: number;
}

export type ResizeEdge = 'start' | 'end';

export type DragRefusal = 'none' | 'overlap' | 'future' | 'approved';

export interface DragRules {
	/** The shown member's logs, every one of them: what a moved entry must not overlap. */
	memberLogs: ReadonlyArray<ITimeLog>;
	approvedDayKeys: ReadonlySet<string>;
	allowsFutureDates: boolean;
	now: Date;
}

export interface CreatableSpot {
	refusal: DragRefusal;
	/** The free time around the spot: a selection started there stays inside it. */
	window: TimeWindow | null;
}

function clampedMinuteOf(minute: number) {
	const notBeforeMidnight = Math.max(minute, 0);
	return Math.min(notBeforeMidnight, MINUTES_IN_DAY);
}

export function gridMinuteAt(offsetPx: number, hourHeightPx: number) {
	const hours = offsetPx / hourHeightPx;
	const minute = hours * MINUTES_PER_HOUR;
	return clampedMinuteOf(minute);
}

export function snappedMinuteOf(minute: number, step: number) {
	const stepIndex = Math.round(minute / step);
	const snapped = stepIndex * step;
	return clampedMinuteOf(snapped);
}

function minuteFlooredTo(minute: number, step: number) {
	const stepIndex = Math.floor(minute / step);
	return stepIndex * step;
}

function minuteRaisedTo(minute: number, step: number) {
	const stepIndex = Math.ceil(minute / step);
	return stepIndex * step;
}

/**
 * The moment a grid minute stands for. The grid counts elapsed minutes from the day's midnight, as it places the
 * entries, so a day made shorter by a clock change ends at its real midnight. The bottom of the column is that
 * midnight too on a day made longer by one: the grid draws whatever ends in its last hour at the bottom.
 */
export function timeAtGridMinute(day: Date, minute: number): Date {
	const dayStart = startOfDay(day);
	const nextDayStart = addDays(dayStart, 1);
	const gridMinute = clampedMinuteOf(minute);
	if (gridMinute >= MINUTES_IN_DAY) {
		return nextDayStart;
	}
	const elapsedMilliseconds = gridMinute * MILLISECONDS_PER_MINUTE;
	const time = dayStart.getTime() + elapsedMilliseconds;
	const lastTime = Math.min(time, nextDayStart.getTime());
	return new Date(lastTime);
}

/** The column under a horizontal position, or the nearest one when the pointer is outside every column. */
export function nearestSpanIndexOf(position: number, spans: ReadonlyArray<HorizontalSpan>) {
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const [index, span] of spans.entries()) {
		const distanceBefore = span.left - position;
		const distanceAfter = position - span.right;
		const distance = Math.max(distanceBefore, distanceAfter, 0);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	}
	return nearestIndex;
}

/** How far the grid scrolls when the pointer drags near its top or bottom edge. */
export function edgeScrollStepOf(pointerY: number, top: number, bottom: number) {
	const isNearTop = pointerY < top + EDGE_SCROLL_ZONE_PX;
	if (isNearTop) {
		return -EDGE_SCROLL_STEP_PX;
	}
	const isNearBottom = pointerY > bottom - EDGE_SCROLL_ZONE_PX;
	if (isNearBottom) {
		return EDGE_SCROLL_STEP_PX;
	}
	return 0;
}

/**
 * The minutes a drag over empty time selects: the side where the drag began holds its whole step, the side under
 * the pointer follows it to the nearest step, and the selection is never shorter than one step.
 */
export function selectionRangeOf(anchorMinute: number, pointerMinute: number, step: number): MinuteRange {
	const isDraggingDown = pointerMinute >= anchorMinute;
	if (isDraggingDown) {
		const startMinute = minuteFlooredTo(anchorMinute, step);
		const pointerEnd = snappedMinuteOf(pointerMinute, step);
		const shortestEnd = startMinute + step;
		const endMinute = Math.max(pointerEnd, shortestEnd);
		return { startMinute, endMinute: clampedMinuteOf(endMinute) };
	}
	const endMinute = minuteRaisedTo(anchorMinute, step);
	const pointerStart = snappedMinuteOf(pointerMinute, step);
	const latestStart = endMinute - step;
	const startMinute = Math.min(pointerStart, latestStart);
	return { startMinute: clampedMinuteOf(startMinute), endMinute };
}

/** A range kept inside its limits; null when nothing of it is left. */
export function rangeWithin(range: MinuteRange, limits: MinuteRange): MinuteRange | null {
	const startMinute = Math.max(range.startMinute, limits.startMinute);
	const endMinute = Math.min(range.endMinute, limits.endMinute);
	const isEmpty = endMinute <= startMinute;
	if (isEmpty) {
		return null;
	}
	return { startMinute, endMinute };
}

export function windowOfRange(day: Date, range: MinuteRange): TimeWindow {
	const start = timeAtGridMinute(day, range.startMinute);
	const end = timeAtGridMinute(day, range.endMinute);
	return { start, end };
}

/**
 * A window kept inside the free time it was drawn in. On a day the clock goes back, free time that ends in the day's
 * last hour is drawn down to the bottom of the column, which reads as the next midnight: the selection stops where
 * the free time does.
 */
export function windowWithin(window: TimeWindow, freeTime: TimeWindow): TimeWindow {
	const startTime = Math.max(window.start.getTime(), freeTime.start.getTime());
	const endTime = Math.min(window.end.getTime(), freeTime.end.getTime());
	return { start: new Date(startTime), end: new Date(endTime) };
}

/** The part of a window drawn in one day's column; null when the window is not on that day. */
export function rangeOnDay(window: TimeWindow, day: Date): MinuteRange | null {
	const dayStart = startOfDay(day);
	const nextDayStart = addDays(dayStart, 1);
	const endsBeforeDay = window.end.getTime() <= dayStart.getTime();
	const startsAfterDay = window.start.getTime() >= nextDayStart.getTime();
	if (endsBeforeDay || startsAfterDay) {
		return null;
	}
	const startMinute = minuteOfDay(window.start, dayStart);
	const endMinute = minuteOfDay(window.end, dayStart);
	return { startMinute, endMinute };
}

export interface WindowEdges {
	hasStart: boolean;
	hasEnd: boolean;
}

/** Which edges of a window fall on a day: an entry crossing midnight starts on one day and ends on the next. */
export function edgesOnDay(window: TimeWindow, day: Date): WindowEdges {
	const dayStart = startOfDay(day);
	const nextDayStart = addDays(dayStart, 1);
	const hasStart = window.start.getTime() >= dayStart.getTime();
	const hasEnd = window.end.getTime() <= nextDayStart.getTime();
	return { hasStart, hasEnd };
}

export function isSameWindow(first: TimeWindow, second: TimeWindow) {
	const hasSameStart = first.start.getTime() === second.start.getTime();
	const hasSameEnd = first.end.getTime() === second.end.getTime();
	return hasSameStart && hasSameEnd;
}

function durationMillisecondsOf(window: TimeWindow) {
	return window.end.getTime() - window.start.getTime();
}

/** The latest minute a moved entry may start on: one that ends within its day stays within its day. */
function latestStartMinuteOf(startMinute: number, durationMinutes: number, step: number) {
	const endsWithinDay = startMinute + durationMinutes <= MINUTES_IN_DAY;
	if (!endsWithinDay) {
		return MINUTES_IN_DAY - step;
	}
	const lastFittingMinute = MINUTES_IN_DAY - durationMinutes;
	const lastFittingStep = minuteFlooredTo(lastFittingMinute, step);
	return Math.max(lastFittingStep, 0);
}

/**
 * An entry dragged by `dayShift` columns and `minuteShift` minutes: its start lands on the grid step and its end
 * follows at the same real duration, so an entry crossing midnight or a clock change keeps its length. A drag
 * that comes back to where it began changes nothing, even for an entry that sits off the step.
 */
export function movedWindowOf(window: TimeWindow, dayShift: number, minuteShift: number, step: number): TimeWindow {
	const snappedShift = Math.round(minuteShift / step) * step;
	const staysOnDay = dayShift === 0;
	const staysOnMinute = snappedShift === 0;
	if (staysOnDay && staysOnMinute) {
		return window;
	}
	const startDay = startOfDay(window.start);
	const startMinute = minuteOfDay(window.start, startDay);
	const durationMilliseconds = durationMillisecondsOf(window);
	const durationMinutes = Math.ceil(durationMilliseconds / MILLISECONDS_PER_MINUTE);
	const wantedMinute = snappedMinuteOf(startMinute + minuteShift, step);
	const latestMinute = latestStartMinuteOf(startMinute, durationMinutes, step);
	const targetMinute = Math.min(wantedMinute, latestMinute);
	const targetDay = addDays(startDay, dayShift);
	const start = timeAtGridMinute(targetDay, targetMinute);
	const endTime = start.getTime() + durationMilliseconds;
	return { start, end: new Date(endTime) };
}

/**
 * An entry with one edge dragged to a minute of `day`: the other edge stays, and one step of time always remains. An
 * edge brought back to the step where it is drawn keeps its real moment, as a move that comes back changes nothing:
 * an edge off the step, or an end drawn at the bottom of a 25-hour day, is not cut short by being touched.
 */
export function resizedWindowOf(
	window: TimeWindow,
	edge: ResizeEdge,
	day: Date,
	pointerMinute: number,
	step: number
): TimeWindow {
	const snappedMinute = snappedMinuteOf(pointerMinute, step);
	const edgeTime = edge === 'start' ? window.start : window.end;
	const drawnMinute = minuteOfDay(edgeTime, startOfDay(day));
	const isAtDrawnStep = snappedMinuteOf(drawnMinute, step) === snappedMinute;
	if (isAtDrawnStep) {
		return window;
	}
	const candidate = timeAtGridMinute(day, snappedMinute);
	const stepMilliseconds = step * MILLISECONDS_PER_MINUTE;
	if (edge === 'start') {
		const latestStartTime = window.end.getTime() - stepMilliseconds;
		const startTime = Math.min(candidate.getTime(), latestStartTime);
		return { start: new Date(startTime), end: window.end };
	}
	const earliestEndTime = window.start.getTime() + stepMilliseconds;
	const endTime = Math.max(candidate.getTime(), earliestEndTime);
	return { start: window.start, end: new Date(endTime) };
}

export function overlapsAnyWindow(window: TimeWindow, others: ReadonlyArray<TimeWindow>) {
	return others.some((other) => {
		const startsBeforeEnd = other.start.getTime() < window.end.getTime();
		const endsAfterStart = other.end.getTime() > window.start.getTime();
		return startsBeforeEnd && endsAfterStart;
	});
}

/** The last day a window covers: one ending at midnight belongs to the day before. */
function lastDayOf(window: TimeWindow) {
	const lastMoment = Math.max(window.end.getTime() - 1, window.start.getTime());
	return startOfDay(new Date(lastMoment));
}

function boundsOfWindow(window: TimeWindow): DayBounds {
	const start = startOfDay(window.start);
	const lastDay = lastDayOf(window);
	const end = addDays(lastDay, 1);
	return { start, end };
}

export function dayKeysOfWindow(window: TimeWindow): string[] {
	const bounds = boundsOfWindow(window);
	const keys: string[] = [];
	for (let day = bounds.start; day.getTime() < bounds.end.getTime(); day = addDays(day, 1)) {
		keys.push(localDayKeyOf(day));
	}
	return keys;
}

function touchesApprovedDay(window: TimeWindow, approvedDayKeys: ReadonlySet<string>) {
	const dayKeys = dayKeysOfWindow(window);
	return dayKeys.some((dayKey) => approvedDayKeys.has(dayKey));
}

/**
 * Why a moved or resized entry may not take its new place, by the rules of the editable week sheet: no time leaves
 * or enters an approved day, nothing ends after now when the organization refuses future time, and nothing lands on
 * another entry of the member, since the API deletes whatever a manual entry overlaps.
 */
export function dragRefusalOf(logId: string, previous: TimeWindow, next: TimeWindow, rules: DragRules): DragRefusal {
	const leavesApprovedDay = touchesApprovedDay(previous, rules.approvedDayKeys);
	const entersApprovedDay = touchesApprovedDay(next, rules.approvedDayKeys);
	if (leavesApprovedDay || entersApprovedDay) {
		return 'approved';
	}
	const bounds = boundsOfWindow(next);
	const limit = placementLimitOf(bounds, rules.now, rules.allowsFutureDates);
	const endsAfterLimit = next.end.getTime() > limit.getTime();
	if (endsAfterLimit) {
		return 'future';
	}
	const otherLogs = rules.memberLogs.filter((log) => log.id !== logId);
	const busy = busyWindowsOf(otherLogs, bounds);
	if (overlapsAnyWindow(next, busy)) {
		return 'overlap';
	}
	return 'none';
}

/** Whether new time may start at a moment of the grid, and the free time around it. */
export function creatableSpotAt(time: Date, rules: DragRules): CreatableSpot {
	const day = startOfDay(time);
	const dayKey = localDayKeyOf(day);
	if (rules.approvedDayKeys.has(dayKey)) {
		return { refusal: 'approved', window: null };
	}
	const bounds = dayBoundsOf(day);
	const limit = placementLimitOf(bounds, rules.now, rules.allowsFutureDates);
	const isAfterLimit = time.getTime() >= limit.getTime();
	if (isAfterLimit) {
		return { refusal: 'future', window: null };
	}
	const busy = busyWindowsOf(rules.memberLogs, bounds);
	const freeWindows = freeWindowsBetween(busy, bounds, limit);
	const window = freeWindows.find((free) => {
		const startsBeforeTime = free.start.getTime() <= time.getTime();
		const endsAfterTime = free.end.getTime() > time.getTime();
		return startsBeforeTime && endsAfterTime;
	});
	if (!window) {
		return { refusal: 'overlap', window: null };
	}
	return { refusal: 'none', window };
}

/** The logs with the entries being saved drawn at their new place, until the next read brings them back. */
export function logsWithMovedWindows(
	logs: ReadonlyArray<ITimeLog>,
	movedWindows: ReadonlyMap<string, TimeWindow>
): ReadonlyArray<ITimeLog> {
	if (movedWindows.size === 0) {
		return logs;
	}
	return logs.map((log) => {
		const window = movedWindows.get(log.id);
		if (!window) {
			return log;
		}
		return { ...log, startedAt: window.start, stoppedAt: window.end };
	});
}
