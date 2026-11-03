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
