import { addDays, isAfter, setHours, startOfDay, startOfMinute } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	endOfLog,
	isManualLog,
	logDurationSeconds,
	type SheetCell,
	type SheetDay,
	type SheetRowIdentity,
	sheetRowKeyFor,
	startOfLog,
	statusOfLog,
	workDayOfLog
} from './timesheets';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

export const MAX_CELL_SECONDS = HOURS_PER_DAY * SECONDS_PER_HOUR;

/** Time added to a day is laid out from this hour onward, then before it. */
const PLACEMENT_START_HOUR = 9;

export interface TimeWindow {
	start: Date;
	end: Date;
}

function windowSecondsOf(window: TimeWindow) {
	const milliseconds = window.end.getTime() - window.start.getTime();
	const seconds = Math.round(milliseconds / MILLISECONDS_PER_SECOND);
	return Math.max(0, seconds);
}

function secondsLater(date: Date, seconds: number) {
	const time = date.getTime() + seconds * MILLISECONDS_PER_SECOND;
	return new Date(time);
}

function secondsEarlier(date: Date, seconds: number) {
	const time = date.getTime() - seconds * MILLISECONDS_PER_SECOND;
	return new Date(time);
}

const CLOCK_INPUT = /^(\d{1,2}):(\d{1,2})$/;
const HOURS_INPUT = /^(\d+(?:\.\d+)?)$/;
const HOURS_AND_MINUTES_INPUT = /^(\d+(?:\.\d+)?)\s*h(?:\s*(\d{1,2})\s*m?)?$/;
const MINUTES_INPUT = /^(\d+)\s*m(?:in)?$/;

function minutesToSeconds(minutes: number) {
	const wholeMinutes = Math.round(minutes);
	return wholeMinutes * SECONDS_PER_MINUTE;
}

function hoursToSeconds(hours: number) {
	const minutes = hours * MINUTES_PER_HOUR;
	return minutesToSeconds(minutes);
}

function clockSecondsOf(hours: number, minutes: number) {
	const hourSeconds = hours * SECONDS_PER_HOUR;
	const minuteSeconds = minutes * SECONDS_PER_MINUTE;
	return hourSeconds + minuteSeconds;
}

function secondsOfClock(match: RegExpMatchArray): number | null {
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (minutes >= MINUTES_PER_HOUR) {
		return null;
	}
	return clockSecondsOf(hours, minutes);
}

function secondsOfHoursAndMinutes(match: RegExpMatchArray): number | null {
	const hours = Number(match[1]);
	const hourSeconds = hoursToSeconds(hours);
	const minutesText = match[2];
	if (!minutesText) {
		return hourSeconds;
	}
	const minutes = Number(minutesText);
	if (minutes >= MINUTES_PER_HOUR) {
		return null;
	}
	const minuteSeconds = minutes * SECONDS_PER_MINUTE;
	return hourSeconds + minuteSeconds;
}

function unboundedSecondsOf(text: string): number | null {
	const clock = CLOCK_INPUT.exec(text);
	if (clock) {
		return secondsOfClock(clock);
	}
	const hoursMatch = HOURS_INPUT.exec(text);
	if (hoursMatch) {
		const hours = Number(hoursMatch[1]);
		return hoursToSeconds(hours);
	}
	const hoursAndMinutes = HOURS_AND_MINUTES_INPUT.exec(text);
	if (hoursAndMinutes) {
		return secondsOfHoursAndMinutes(hoursAndMinutes);
	}
	const minutesMatch = MINUTES_INPUT.exec(text);
	if (minutesMatch) {
		const minutes = Number(minutesMatch[1]);
		return minutesToSeconds(minutes);
	}
	return null;
}

/**
 * The duration typed in a sheet cell, in whole minutes: `2` and `1.5` (or `1,5`) are hours, `1:30`, `1h30`,
 * `1h 30m` and `90m` read as they look, and an empty cell is zero. Null when the text is not a duration or is longer
 * than a day.
 */
export function parseDurationInput(text: string): number | null {
	const trimmed = text.trim();
	const lowerCased = trimmed.toLowerCase();
	const normalized = lowerCased.replace(',', '.');
	if (!normalized) {
		return 0;
	}
	const seconds = unboundedSecondsOf(normalized);
	if (seconds === null) {
		return null;
	}
	const isTooLong = seconds > MAX_CELL_SECONDS;
	if (isTooLong) {
		return null;
	}
	return seconds;
}

export function wholeMinutesOf(seconds: number) {
	const safeSeconds = Math.max(0, seconds);
	const minutes = Math.floor(safeSeconds / SECONDS_PER_MINUTE);
	return minutes * SECONDS_PER_MINUTE;
}

export interface DayBounds {
	start: Date;
	end: Date;
}

export function dayBoundsOf(day: Date): DayBounds {
	const start = startOfDay(day);
	const end = addDays(start, 1);
	return { start, end };
}

/** Where a log sits in time; a running log holds the rest of its day, since it keeps growing. */
function busyWindowOf(log: ITimeLog, dayEnd: Date): TimeWindow | null {
	const start = startOfLog(log);
	if (!start) {
		return null;
	}
	if (log.isRunning) {
		return { start, end: dayEnd };
	}
	const end = endOfLog(log);
	if (end) {
		return { start, end };
	}
	const duration = logDurationSeconds(log);
	const estimatedEnd = secondsLater(start, duration);
	return { start, end: estimatedEnd };
}

function byWindowStart(first: TimeWindow, second: TimeWindow) {
	return first.start.getTime() - second.start.getTime();
}

function mergedWindowsOf(windows: ReadonlyArray<TimeWindow>): TimeWindow[] {
	const sorted = [...windows].sort(byWindowStart);
	const merged: TimeWindow[] = [];
	for (const window of sorted) {
		const last = merged.at(-1);
		if (last) {
			const touchesLast = window.start.getTime() <= last.end.getTime();
			if (touchesLast) {
				const laterEnd = Math.max(last.end.getTime(), window.end.getTime());
				last.end = new Date(laterEnd);
				continue;
			}
		}
		merged.push({ start: window.start, end: window.end });
	}
	return merged;
}

function snappedWindowOf(window: TimeWindow): TimeWindow | null {
	const startMinute = startOfMinute(window.start);
	const startsMidMinute = startMinute.getTime() < window.start.getTime();
	let start = startMinute;
	if (startsMidMinute) {
		start = secondsLater(startMinute, SECONDS_PER_MINUTE);
	}
	const end = startOfMinute(window.end);
	const isEmpty = end.getTime() <= start.getTime();
	if (isEmpty) {
		return null;
	}
	return { start, end };
}

function gapsBetween(busy: ReadonlyArray<TimeWindow>, bounds: DayBounds): TimeWindow[] {
	const gaps: TimeWindow[] = [];
	let cursor = bounds.start;
	for (const window of busy) {
		const startsAfterCursor = window.start.getTime() > cursor.getTime();
		if (startsAfterCursor) {
			gaps.push({ start: cursor, end: window.start });
		}
		const endsAfterCursor = window.end.getTime() > cursor.getTime();
		if (endsAfterCursor) {
			cursor = window.end;
		}
	}
	gaps.push({ start: cursor, end: bounds.end });
	return gaps;
}

function overlapsDay(window: TimeWindow, bounds: DayBounds) {
	const endsAfterDayStart = window.end.getTime() > bounds.start.getTime();
	const startsBeforeDayEnd = window.start.getTime() < bounds.end.getTime();
	return endsAfterDayStart && startsBeforeDayEnd;
}

export function busyWindowsOf(memberLogs: ReadonlyArray<ITimeLog>, bounds: DayBounds): TimeWindow[] {
	const busy: TimeWindow[] = [];
	for (const log of memberLogs) {
		const window = busyWindowOf(log, bounds.end);
		if (!window) {
			continue;
		}
		if (overlapsDay(window, bounds)) {
			busy.push(window);
		}
	}
	return busy;
}

export function freeWindowsBetween(busy: ReadonlyArray<TimeWindow>, bounds: DayBounds, limit: Date): TimeWindow[] {
	const merged = mergedWindowsOf(busy);
	const gaps = gapsBetween(merged, bounds);
	const free: TimeWindow[] = [];
	for (const gap of gaps) {
		const endTime = Math.min(gap.end.getTime(), limit.getTime());
		const end = new Date(endTime);
		const snapped = snappedWindowOf({ start: gap.start, end });
		if (snapped) {
			free.push(snapped);
		}
	}
	return free;
}

export function freeSecondsOf(windows: ReadonlyArray<TimeWindow>) {
	let total = 0;
	for (const window of windows) {
		total += windowSecondsOf(window);
	}
	return total;
}

interface PlacementPass {
	fromAnchor: TimeWindow[];
	beforeAnchor: TimeWindow[];
}

function placementPassOf(windows: ReadonlyArray<TimeWindow>, anchor: Date): PlacementPass {
	const fromAnchor: TimeWindow[] = [];
	const beforeAnchor: TimeWindow[] = [];
	const anchorTime = anchor.getTime();
	for (const window of windows) {
		const startsFromAnchor = window.start.getTime() >= anchorTime;
		if (startsFromAnchor) {
			fromAnchor.push(window);
			continue;
		}
		const endsBeforeAnchor = window.end.getTime() <= anchorTime;
		if (endsBeforeAnchor) {
			beforeAnchor.push(window);
			continue;
		}
		beforeAnchor.push({ start: window.start, end: anchor });
		fromAnchor.push({ start: anchor, end: window.end });
	}
	beforeAnchor.reverse();
	return { fromAnchor, beforeAnchor };
}

function placementAnchorOf(day: Date) {
	const midnight = startOfDay(day);
	return setHours(midnight, PLACEMENT_START_HOUR);
}

/**
 * Where `seconds` of new time go in a day's free windows, as the intervals to record: from 09:00 onward first, each
 * window filled from its start, then before 09:00, each window filled up to its end so the time stays near the
 * working day. Intervals that touch come back as one, so a single free stretch around 09:00 gives a single entry.
 * Null when the free time is shorter than asked.
 */
export function placementOf(seconds: number, windows: ReadonlyArray<TimeWindow>, day: Date): TimeWindow[] | null {
	const available = freeSecondsOf(windows);
	const fits = available >= seconds;
	if (!fits) {
		return null;
	}
	const anchor = placementAnchorOf(day);
	const pass = placementPassOf(windows, anchor);
	const pieces: TimeWindow[] = [];
	let remaining = seconds;
	for (const window of pass.fromAnchor) {
		if (remaining <= 0) {
			break;
		}
		const windowSeconds = windowSecondsOf(window);
		const taken = Math.min(remaining, windowSeconds);
		const end = secondsLater(window.start, taken);
		pieces.push({ start: window.start, end });
		remaining -= taken;
	}
	for (const window of pass.beforeAnchor) {
		if (remaining <= 0) {
			break;
		}
		const windowSeconds = windowSecondsOf(window);
		const taken = Math.min(remaining, windowSeconds);
		const start = secondsEarlier(window.end, taken);
		pieces.push({ start, end: window.end });
		remaining -= taken;
	}
	return mergedWindowsOf(pieces);
}

export interface ReductionPlan {
	deleteIds: string[];
	shorten: { log: ITimeLog; stoppedAt: Date } | null;
}

/** Time added by hand and stopped: the only entries the web lowers, moves or resizes. */
export function isReducibleLog(log: ITimeLog) {
	const isManual = isManualLog(log);
	const isStopped = !log.isRunning;
	return isManual && isStopped;
}

function startTimeOrZero(log: ITimeLog) {
	const start = startOfLog(log);
	if (!start) {
		return 0;
	}
	return start.getTime();
}

function byStartDescending(first: ITimeLog, second: ITimeLog) {
	return startTimeOrZero(second) - startTimeOrZero(first);
}

export function reducibleSecondsOf(cellLogs: ReadonlyArray<ITimeLog>) {
	let total = 0;
	for (const log of cellLogs) {
		if (isReducibleLog(log)) {
			total += logDurationSeconds(log);
		}
	}
	return total;
}

/**
 * How to take `excessSeconds` out of a cell: manual entries from the latest, deleted whole while they fit, the last
 * one shortened. Null when the cell's manual time is not enough, so tracked time is never cut.
 */
export function reductionOf(cellLogs: ReadonlyArray<ITimeLog>, excessSeconds: number): ReductionPlan | null {
	const reducible = reducibleSecondsOf(cellLogs);
	const isEnough = reducible >= excessSeconds;
	if (!isEnough) {
		return null;
	}
	const manualLogs = cellLogs.filter(isReducibleLog);
	manualLogs.sort(byStartDescending);
	const deleteIds: string[] = [];
	let shorten: ReductionPlan['shorten'] = null;
	let remaining = excessSeconds;
	for (const log of manualLogs) {
		if (remaining <= 0) {
			break;
		}
		const duration = logDurationSeconds(log);
		const fitsWhole = duration <= remaining;
		if (fitsWhole) {
			deleteIds.push(log.id);
			remaining -= duration;
			continue;
		}
		const end = endOfLog(log);
		if (!end) {
			return null;
		}
		const stoppedAt = secondsEarlier(end, remaining);
		shorten = { log, stoppedAt };
		remaining = 0;
	}
	return { deleteIds, shorten };
}

export type CellLock =
	| 'none'
	| 'loading'
	| 'filtered'
	| 'permission'
	| 'manualTimeOff'
	| 'future'
	| 'approved'
	| 'running';

export interface SheetEditRules {
	isLoading: boolean;
	/** A status, search, project or task filter hides part of the member's time, so a cell's total is not all of it. */
	isFiltered: boolean;
	canWrite: boolean;
	/** The organization allows manual time (unknown counts as allowed: the API decides). */
	allowsManualTime: boolean;
	allowsFutureDates: boolean;
	approvedDayKeys: ReadonlySet<string>;
	now: Date;
}

function isFutureDay(day: SheetDay, now: Date) {
	const dayStart = startOfDay(day.date);
	const today = startOfDay(now);
	return isAfter(dayStart, today);
}

function hasRunningLog(cell: SheetCell | undefined) {
	if (!cell) {
		return false;
	}
	return cell.logs.some((log) => log.isRunning === true);
}

export function sheetLockOf(rules: SheetEditRules): CellLock {
	if (rules.isLoading) {
		return 'loading';
	}
	if (rules.isFiltered) {
		return 'filtered';
	}
	if (!rules.canWrite) {
		return 'permission';
	}
	if (!rules.allowsManualTime) {
		return 'manualTimeOff';
	}
	return 'none';
}

export function cellLockOf(rules: SheetEditRules, day: SheetDay, cell: SheetCell | undefined): CellLock {
	const sheetLock = sheetLockOf(rules);
	if (sheetLock !== 'none') {
		return sheetLock;
	}
	const isAhead = isFutureDay(day, rules.now);
	const isLockedFuture = isAhead && !rules.allowsFutureDates;
	if (isLockedFuture) {
		return 'future';
	}
	if (rules.approvedDayKeys.has(day.key)) {
		return 'approved';
	}
	if (hasRunningLog(cell)) {
		return 'running';
	}
	return 'none';
}

function daysBetweenDates(first: Date, last: Date): Date[] {
	const days: Date[] = [];
	let current = startOfDay(first);
	const lastDay = startOfDay(last);
	while (!isAfter(current, lastDay)) {
		days.push(current);
		current = addDays(current, 1);
	}
	return days;
}

function approvedDaysOfLog(log: ITimeLog): Date[] {
	const timesheetStart = log.timesheet?.startedAt;
	const timesheetEnd = log.timesheet?.stoppedAt;
	if (timesheetStart && timesheetEnd) {
		const first = new Date(timesheetStart);
		const last = new Date(timesheetEnd);
		return daysBetweenDates(first, last);
	}
	const workDay = workDayOfLog(log);
	if (workDay) {
		return [workDay];
	}
	return [];
}

/**
 * The days of the member's approved timesheets: Gauzy files every log of a week in that week's timesheet, so time
 * added to one of these days would join a timesheet already approved.
 */
export function approvedDayKeysOf(logs: ReadonlyArray<ITimeLog>): Set<string> {
	const keys = new Set<string>();
	for (const log of logs) {
		const isApproved = statusOfLog(log) === ETimesheetStatus.APPROVED;
		if (!isApproved) {
			continue;
		}
		for (const date of approvedDaysOfLog(log)) {
			keys.add(localDayKeyOf(date));
		}
	}
	return keys;
}

/** The latest moment time may end on a day: its end, or now when the organization refuses time in the future. */
export function placementLimitOf(bounds: DayBounds, now: Date, allowsFutureDates: boolean): Date {
	if (allowsFutureDates) {
		return bounds.end;
	}
	const endsAfterNow = bounds.end.getTime() > now.getTime();
	if (endsAfterNow) {
		return now;
	}
	return bounds.end;
}

export function sheetCellKeyOf(rowKey: string, dayKey: string) {
	return `${rowKey}|${dayKey}`;
}

export function dayDateOfKey(dayKey: string): Date {
	const parts = dayKey.split('-');
	const [year, month, day] = parts.map(Number);
	const monthIndex = month - 1;
	return new Date(year, monthIndex, day);
}

export interface PreviousWeekRow {
	identity: SheetRowIdentity;
	secondsByDayKey: ReadonlyMap<string, number>;
}

export interface CopyCellPlan {
	identity: SheetRowIdentity;
	day: SheetDay;
	seconds: number;
}

function sameWeekdayNextWeekKey(dayKey: string) {
	const date = dayDateOfKey(dayKey);
	const nextWeek = addDays(date, DAYS_PER_WEEK);
	return localDayKeyOf(nextWeek);
}

/**
 * What "Rows and time" adds: for every row of the previous week and every day it has time on, the same time on the
 * same weekday of this period, when that cell is still empty. Locks are checked by the caller.
 */
export function copyPlanOf(
	previousRows: ReadonlyArray<PreviousWeekRow>,
	days: ReadonlyArray<SheetDay>,
	filledCellKeys: ReadonlySet<string>
): CopyCellPlan[] {
	const dayByKey = new Map<string, SheetDay>();
	for (const day of days) {
		dayByKey.set(day.key, day);
	}
	const plans: CopyCellPlan[] = [];
	for (const row of previousRows) {
		for (const [previousDayKey, seconds] of row.secondsByDayKey) {
			const minutes = wholeMinutesOf(seconds);
			if (minutes <= 0) {
				continue;
			}
			const targetKey = sameWeekdayNextWeekKey(previousDayKey);
			const day = dayByKey.get(targetKey);
			if (!day) {
				continue;
			}
			const cellKey = sheetCellKeyOf(row.identity.key, targetKey);
			if (filledCellKeys.has(cellKey)) {
				continue;
			}
			plans.push({ identity: row.identity, day, seconds: minutes });
		}
	}
	return plans;
}

function taskNumberTextOf(task: TTask): string | null {
	if (task.taskNumber) {
		return task.taskNumber;
	}
	const hasNumber = typeof task.number === 'number';
	if (hasNumber) {
		return `#${task.number}`;
	}
	return null;
}

/** The row a task picked in "Add row" stands for: the task's own project, the team the sheet is read in. */
export function rowIdentityOfTask(
	task: TTask,
	project: TOrganizationProject | undefined,
	teamId: string | null
): SheetRowIdentity {
	const projectId = task.projectId ?? null;
	return {
		key: sheetRowKeyFor(projectId, task.id),
		projectId,
		taskId: task.id,
		organizationTeamId: teamId,
		projectName: project?.name ?? null,
		projectColor: project?.color ?? null,
		projectImageUrl: project?.imageUrl ?? null,
		taskTitle: task.title,
		taskNumber: taskNumberTextOf(task),
		issueType: task.issueType ?? null,
		isBillable: project?.billable === true
	};
}

export function totalSecondsOfPlans(plans: ReadonlyArray<CopyCellPlan>) {
	let total = 0;
	for (const plan of plans) {
		total += plan.seconds;
	}
	return total;
}

export interface CopyFit {
	fitting: CopyCellPlan[];
	withoutRoomCount: number;
}

/**
 * The copy plans that find room in their day, tried in order the way the copy writes them: the time one plan takes
 * is no longer free for the next plans of the same day.
 */
export function copyFitOf(
	plans: ReadonlyArray<CopyCellPlan>,
	memberLogs: ReadonlyArray<ITimeLog>,
	now: Date,
	allowsFutureDates: boolean
): CopyFit {
	const fitting: CopyCellPlan[] = [];
	const placedByDay = new Map<string, TimeWindow[]>();
	for (const plan of plans) {
		const bounds = dayBoundsOf(plan.day.date);
		const placedBefore = placedByDay.get(plan.day.key) ?? [];
		const logBusy = busyWindowsOf(memberLogs, bounds);
		const busy = [...logBusy, ...placedBefore];
		const limit = placementLimitOf(bounds, now, allowsFutureDates);
		const freeWindows = freeWindowsBetween(busy, bounds, limit);
		const pieces = placementOf(plan.seconds, freeWindows, plan.day.date);
		if (!pieces) {
			continue;
		}
		placedByDay.set(plan.day.key, [...placedBefore, ...pieces]);
		fitting.push(plan);
	}
	const withoutRoomCount = plans.length - fitting.length;
	return { fitting, withoutRoomCount };
}
