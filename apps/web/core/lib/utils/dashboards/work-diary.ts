import {
	addDays,
	addMinutes,
	differenceInCalendarDays,
	eachDayOfInterval,
	endOfWeek,
	isSameDay,
	startOfDay,
	startOfWeek
} from 'date-fns';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import { clampedDayOfPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import type { TTimeSlotsData } from '@/core/types/schemas/timer/time-slot.schema';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { startOfLog, TIMESHEET_WEEK_START } from './timesheets';

const SLOT_MINUTES = 10;
const SLOTS_PER_HOUR = 6;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
/** A period up to two weeks shows every day; a longer one shows the week of the day on screen. */
const MAX_STRIP_DAYS = 14;

export interface DiaryShot {
	id: string;
	thumbUrl: string;
	fullUrl: string;
	recordedAt: Date | null;
}

export interface DiarySlot {
	id: string;
	start: Date;
	end: Date;
	seconds: number;
	/** Null when the slot has no activity figure, which a browser timer never records. */
	activityPercent: number | null;
	shots: DiaryShot[];
}

export interface DiaryHour {
	hour: number;
	seconds: number;
	/** Six places, one per ten minutes; null where nothing was tracked. */
	positions: Array<DiarySlot | null>;
}

export interface DiaryDay {
	hours: DiaryHour[];
	seconds: number;
	slotCount: number;
	shotCount: number;
	activityPercent: number | null;
}

function validDateOf(value: unknown): Date | null {
	const isDateLike = typeof value === 'string' || value instanceof Date;
	if (!isDateLike) {
		return null;
	}
	const date = new Date(value);
	const isInvalid = Number.isNaN(date.getTime());
	if (isInvalid) {
		return null;
	}
	return date;
}

function textOf(value: unknown) {
	if (typeof value !== 'string') {
		return '';
	}
	return value.trim();
}

function firstTextOf(...values: unknown[]) {
	for (const value of values) {
		const text = textOf(value);
		if (text) {
			return text;
		}
	}
	return '';
}

/** Gauzy types the slot's screenshots loosely: only the ones with an image address are kept. */
function shotOf(raw: unknown): DiaryShot | null {
	const isRecord = typeof raw === 'object' && raw !== null;
	if (!isRecord) {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const thumbUrl = firstTextOf(record.thumbUrl, record.fullUrl, record.fileUrl);
	if (!thumbUrl) {
		return null;
	}
	const fullUrl = firstTextOf(record.fullUrl, record.fileUrl, record.thumbUrl);
	const id = firstTextOf(record.id, thumbUrl);
	return { id, thumbUrl, fullUrl, recordedAt: validDateOf(record.recordedAt) };
}

function shotsOf(slot: TTimeSlotsData): DiaryShot[] {
	const shots: DiaryShot[] = [];
	for (const raw of slot.screenshots ?? []) {
		const shot = shotOf(raw);
		if (shot) {
			shots.push(shot);
		}
	}
	return shots;
}

function activityPercentOf(slot: TTimeSlotsData) {
	const percent = Number(slot.percentage);
	const isRecorded = Number.isFinite(percent) && percent > 0;
	if (!isRecorded) {
		return null;
	}
	return Math.min(percent, 100);
}

export function diarySlotOf(slot: TTimeSlotsData): DiarySlot | null {
	const start = validDateOf(slot.startedAt);
	if (!start) {
		return null;
	}
	let end = validDateOf(slot.stoppedAt);
	end ??= addMinutes(start, SLOT_MINUTES);
	const reported = Number(slot.duration) || 0;
	return {
		id: slot.id,
		start,
		end,
		seconds: Math.max(reported, 0),
		activityPercent: activityPercentOf(slot),
		shots: shotsOf(slot)
	};
}

function weightedActivityOf(slots: ReadonlyArray<DiarySlot>) {
	let weightedSum = 0;
	let weight = 0;
	for (const slot of slots) {
		if (slot.activityPercent === null) {
			continue;
		}
		const slotWeight = Math.max(slot.seconds, 1);
		weightedSum += slot.activityPercent * slotWeight;
		weight += slotWeight;
	}
	if (weight === 0) {
		return null;
	}
	return weightedSum / weight;
}

/** The day's ten-minute slots, hour by hour, each hour with its six places so the grid lines up by the minute. */
export function diaryDayOf(timeSlots: ReadonlyArray<TTimeSlotsData>, day: Date): DiaryDay {
	const slots: DiarySlot[] = [];
	for (const raw of timeSlots) {
		const slot = diarySlotOf(raw);
		if (!slot) {
			continue;
		}
		const isOfDay = isSameDay(slot.start, day);
		if (isOfDay) {
			slots.push(slot);
		}
	}
	slots.sort((first, second) => first.start.getTime() - second.start.getTime());
	const byHour = new Map<number, DiaryHour>();
	let seconds = 0;
	let shotCount = 0;
	for (const slot of slots) {
		const hour = slot.start.getHours();
		const minutes = slot.start.getMinutes();
		const positionIndex = Math.floor(minutes / SLOT_MINUTES);
		const entry = byHour.get(hour) ?? {
			hour,
			seconds: 0,
			positions: Array.from({ length: SLOTS_PER_HOUR }, () => null)
		};
		entry.positions[positionIndex] = slot;
		entry.seconds += slot.seconds;
		byHour.set(hour, entry);
		seconds += slot.seconds;
		shotCount += slot.shots.length;
	}
	const hours: DiaryHour[] = [];
	for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
		const entry = byHour.get(hour);
		if (entry) {
			hours.push(entry);
		}
	}
	return { hours, seconds, slotCount: slots.length, shotCount, activityPercent: weightedActivityOf(slots) };
}

/** The days the strip shows: the whole period up to two weeks, otherwise the week of the day on screen. */
export function diaryStripDaysOf(period: Period, day: Date): Date[] {
	const first = startOfDay(period.from);
	const last = startOfDay(period.to);
	const length = differenceInCalendarDays(last, first) + 1;
	const isShort = length <= MAX_STRIP_DAYS;
	if (isShort) {
		return eachDayOfInterval({ start: first, end: last });
	}
	const weekStart = startOfWeek(day, { weekStartsOn: TIMESHEET_WEEK_START });
	const weekEnd = endOfWeek(day, { weekStartsOn: TIMESHEET_WEEK_START });
	const start = clampedDayOfPeriod(weekStart, period);
	const end = clampedDayOfPeriod(weekEnd, period);
	return eachDayOfInterval({ start, end });
}

export function hasLongStripOf(period: Period) {
	const length = differenceInCalendarDays(period.to, period.from) + 1;
	return length > MAX_STRIP_DAYS;
}

export function shiftedDiaryWeekOf(day: Date, direction: 1 | -1, period: Period) {
	const step = DAYS_PER_WEEK * direction;
	const shifted = addDays(day, step);
	return clampedDayOfPeriod(shifted, period);
}

/** The latest day the logs hold, at midnight: where a member's diary opens. */
export function latestLogDayOf(logs: ReadonlyArray<ITimeLog>): Date | null {
	let latest: Date | null = null;
	for (const log of logs) {
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const isLater = !latest || start.getTime() > latest.getTime();
		if (isLater) {
			latest = start;
		}
	}
	if (!latest) {
		return null;
	}
	return startOfDay(latest);
}

/** The days the member tracked time on, by local day key, from the logs the timesheet already holds. */
export function trackedDayKeysOf(logs: ReadonlyArray<ITimeLog>, employeeId: string | null) {
	const keys = new Set<string>();
	if (!employeeId) {
		return keys;
	}
	for (const log of logs) {
		const isMember = log.employeeId === employeeId;
		if (!isMember) {
			continue;
		}
		const start = startOfLog(log);
		if (start) {
			keys.add(localDayKeyOf(start));
		}
	}
	return keys;
}

/** The furthest back the Work diary page steps: its day strip moves a week at a time, its day picker to any day. */
export const DIARY_HISTORY_START = new Date(2000, 0, 1);

const DAY_PARAM = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The day a Work diary link names in its `date` parameter (`YYYY-MM-DD`, a local day), at midnight: today when the
 * parameter is missing, not a real day (`2026-02-31`) or after today.
 */
export function diaryDayOfParam(value: string | null | undefined, now: Date): Date {
	const today = startOfDay(now);
	const match = DAY_PARAM.exec(value ?? '');
	if (!match) {
		return today;
	}
	const [, yearText, monthText, dayText] = match;
	const day = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
	const isRealDay = localDayKeyOf(day) === value;
	if (!isRealDay) {
		return today;
	}
	const isAhead = day.getTime() > today.getTime();
	if (isAhead) {
		return today;
	}
	if (day.getTime() < DIARY_HISTORY_START.getTime()) {
		return DIARY_HISTORY_START;
	}
	return day;
}

/** One task of a Work diary day: its time that day, its project, and one of its logs, for its title and link. */
export interface DiaryTask {
	key: string;
	log: ITimeLog;
	seconds: number;
	projectName: string | null;
	projectColor: string | null;
	isRunning: boolean;
	/** The time tracked without a task: listed with the tasks, but not one of them. */
	isUntasked: boolean;
}

const NO_TASK_KEY = 'no-task';

/** The tasks a day's entries went to, longest first; the time tracked without a task comes as one more row. */
export function diaryTasksOf(entries: ReadonlyArray<CalendarEntry>): DiaryTask[] {
	const byKey = new Map<string, DiaryTask>();
	for (const entry of entries) {
		const taskId = entry.log.task?.id ?? entry.log.taskId ?? null;
		const key = taskId ?? NO_TASK_KEY;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, {
				key,
				log: entry.log,
				seconds: entry.daySeconds,
				projectName: entry.projectName,
				projectColor: entry.projectColor,
				isRunning: entry.isRunning,
				isUntasked: taskId === null
			});
			continue;
		}
		existing.seconds += entry.daySeconds;
		existing.isRunning = existing.isRunning || entry.isRunning;
		// The row names and links its task through this log: a later log of the task that carries its title wins
		const hasTitle = Boolean(existing.log.task?.title);
		if (!hasTitle && entry.log.task?.title) {
			existing.log = entry.log;
		}
		existing.projectName ??= entry.projectName;
		existing.projectColor ??= entry.projectColor;
	}
	return [...byKey.values()].sort((first, second) => second.seconds - first.seconds);
}

/** How many tasks the day's time went to: the time tracked without a task is not one. */
export function diaryTaskCountOf(tasks: ReadonlyArray<DiaryTask>): number {
	return tasks.filter((task) => !task.isUntasked).length;
}
