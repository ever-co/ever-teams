import { endOfDay, isSameDay, startOfDay } from 'date-fns';
import type { TActivityEntry } from '@/core/types/schemas/activities/activity.schema';
import { percentOfDayWindow, timelineHoursOf } from './team-day';

const MILLISECONDS_PER_SECOND = 1000;
const HOURS_PER_DAY = 24;
const SHOWN_APPS = 5;

export type AppActivityKind = 'app' | 'url' | 'unknown';

/** One app or site entry with its own start, end and duration. */
export interface AppActivity {
	id: string;
	title: string;
	detail: string;
	kind: AppActivityKind;
	/** The visited address the entry's metadata holds, for a site's icon (#5023). */
	url?: string | null;
	start: Date;
	end: Date;
	seconds: number;
	employeeId: string | null;
	timeSlotId: string | null;
}

/** An app or site with the time spent in it, the longest window title it had as its detail. */
export interface AppShare {
	key: string;
	title: string;
	detail: string;
	kind: AppActivityKind;
	url?: string | null;
	seconds: number;
	share: number;
}

export interface AppDaySegment {
	key: string;
	appKey: string;
	title: string;
	detail: string;
	start: Date;
	end: Date;
	seconds: number;
	leftPercent: number;
	widthPercent: number;
}

export interface AppHourRow {
	hour: number;
	seconds: number;
	apps: AppShare[];
}

export interface AppDay {
	hours: number[];
	nowPercent: number | null;
	seconds: number;
	segments: AppDaySegment[];
	/** The leading apps and sites of the day, then one "other" bucket; their keys are the ones that get a tone. */
	legend: AppShare[];
	otherCount: number;
	hourRows: AppHourRow[];
}

/** The visited address an entry's metadata holds (an object, or its JSON as a string), if any. */
function urlOfMetaData(metaData: unknown): string | null {
	let value = metaData;
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value);
		} catch {
			return null;
		}
	}
	const isRecord = typeof value === 'object' && value !== null && !Array.isArray(value);
	const url = isRecord ? (value as { url?: unknown }).url : undefined;
	return typeof url === 'string' && url.trim() ? url.trim() : null;
}

function kindOf(type: string | null | undefined): AppActivityKind {
	const normalized = type?.toUpperCase();
	if (normalized === 'APP') {
		return 'app';
	}
	if (normalized === 'URL') {
		return 'url';
	}
	return 'unknown';
}

function validDateOf(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	const isInvalid = Number.isNaN(date.getTime());
	if (isInvalid) {
		return null;
	}
	return date;
}

/** Gauzy fills `recordedAt`; older rows only carry the date and time columns, written in UTC. */
function startOfEntry(entry: TActivityEntry): Date | null {
	const recorded = validDateOf(entry.recordedAt);
	if (recorded) {
		return recorded;
	}
	const hasParts = Boolean(entry.date) && Boolean(entry.time);
	if (!hasParts) {
		return null;
	}
	const day = String(entry.date).slice(0, 10);
	return validDateOf(`${day}T${entry.time}Z`);
}

export function appActivitiesOf(entries: ReadonlyArray<TActivityEntry>): AppActivity[] {
	const activities: AppActivity[] = [];
	for (const entry of entries) {
		const title = entry.title?.trim() ?? '';
		if (!title) {
			continue;
		}
		const start = startOfEntry(entry);
		if (!start) {
			continue;
		}
		const reported = Number(entry.duration) || 0;
		const seconds = Math.max(reported, 0);
		const lengthMilliseconds = seconds * MILLISECONDS_PER_SECOND;
		const endTime = start.getTime() + lengthMilliseconds;
		activities.push({
			id: entry.id,
			title,
			detail: entry.description?.trim() ?? '',
			kind: kindOf(entry.type),
			url: urlOfMetaData(entry.metaData),
			start,
			end: new Date(endTime),
			seconds,
			employeeId: entry.employeeId ?? null,
			timeSlotId: entry.timeSlotId ?? null
		});
	}
	activities.sort((first, second) => first.start.getTime() - second.start.getTime());
	return activities;
}

export function appKeyOf(title: string) {
	return title.toLowerCase();
}

export function totalSecondsOf(activities: ReadonlyArray<{ seconds: number }>) {
	let seconds = 0;
	for (const activity of activities) {
		seconds += activity.seconds;
	}
	return seconds;
}

/** The apps and sites of a set of entries, longest first, each with its share of their total. */
export function appSharesOf(activities: ReadonlyArray<AppActivity>): AppShare[] {
	const byKey = new Map<string, AppShare>();
	const detailSecondsByKey = new Map<string, number>();
	for (const activity of activities) {
		const key = appKeyOf(activity.title);
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, {
				key,
				title: activity.title,
				detail: activity.detail,
				kind: activity.kind,
				url: activity.url ?? null,
				seconds: activity.seconds,
				share: 0
			});
			detailSecondsByKey.set(key, activity.seconds);
			continue;
		}
		existing.seconds += activity.seconds;
		existing.url = existing.url ?? activity.url ?? null;
		const detailSeconds = detailSecondsByKey.get(key) ?? 0;
		const isLongerDetail = activity.seconds > detailSeconds;
		const hasDetail = Boolean(activity.detail);
		if (isLongerDetail && hasDetail) {
			existing.detail = activity.detail;
			detailSecondsByKey.set(key, activity.seconds);
		}
	}
	const shares = [...byKey.values()];
	shares.sort((first, second) => second.seconds - first.seconds);
	const total = totalSecondsOf(shares);
	const divisor = Math.max(total, 1);
	for (const share of shares) {
		const ratio = share.seconds / divisor;
		share.share = ratio * 100;
	}
	return shares;
}

export function activitiesOfEmployee(activities: ReadonlyArray<AppActivity>, employeeId: string) {
	return activities.filter((activity) => activity.employeeId === employeeId);
}

export function activitiesOfSlot(activities: ReadonlyArray<AppActivity>, timeSlotId: string) {
	return activities.filter((activity) => activity.timeSlotId === timeSlotId);
}

function hourRowsOf(activities: ReadonlyArray<AppActivity>): AppHourRow[] {
	const byHour = new Map<number, AppActivity[]>();
	for (const activity of activities) {
		const hour = activity.start.getHours();
		const list = byHour.get(hour) ?? [];
		list.push(activity);
		byHour.set(hour, list);
	}
	const rows: AppHourRow[] = [];
	for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
		const list = byHour.get(hour);
		if (!list) {
			continue;
		}
		rows.push({ hour, seconds: totalSecondsOf(list), apps: appSharesOf(list) });
	}
	return rows;
}

/** One member's day in apps and sites: where each entry sits on the hour window, the leading apps, hour by hour. */
export function appDayOf(activities: ReadonlyArray<AppActivity>, day: Date, now: Date): AppDay {
	const dayStart = startOfDay(day);
	const dayEnd = endOfDay(day);
	const ofDay = activities.filter((activity) => isSameDay(activity.start, day));
	const starts = ofDay.map((activity) => activity.start);
	const ends = ofDay.map((activity) => {
		const clipped = Math.min(activity.end.getTime(), dayEnd.getTime());
		return new Date(clipped);
	});
	const { firstHour, lastHour } = timelineHoursOf(starts, ends);
	const hours: number[] = [];
	for (let hour = firstHour; hour <= lastHour; hour += 1) {
		hours.push(hour);
	}
	const segments = ofDay.map((activity, index) => {
		const end = ends[index];
		const leftPercent = percentOfDayWindow(activity.start, dayStart, firstHour, lastHour);
		const rightPercent = percentOfDayWindow(end, dayStart, firstHour, lastHour);
		const spanPercent = rightPercent - leftPercent;
		return {
			key: activity.id,
			appKey: appKeyOf(activity.title),
			title: activity.title,
			detail: activity.detail,
			start: activity.start,
			end,
			seconds: activity.seconds,
			leftPercent,
			widthPercent: Math.max(spanPercent, 0)
		};
	});
	const shares = appSharesOf(ofDay);
	const legend = shares.slice(0, SHOWN_APPS);
	const otherCount = Math.max(shares.length - SHOWN_APPS, 0);
	let nowPercent: number | null = null;
	const isTodayShown = isSameDay(now, day);
	const nowHour = now.getHours();
	const nowIsInWindow = nowHour >= firstHour && nowHour < lastHour;
	if (isTodayShown && nowIsInWindow) {
		nowPercent = percentOfDayWindow(now, dayStart, firstHour, lastHour);
	}
	return {
		hours,
		nowPercent,
		seconds: totalSecondsOf(ofDay),
		segments,
		legend,
		otherCount,
		hourRows: hourRowsOf(ofDay)
	};
}
