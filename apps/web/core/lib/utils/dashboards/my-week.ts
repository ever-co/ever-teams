import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { type LimitVerdict, limitVerdictOf, percentOf } from '@/core/lib/utils/dashboard-figures';
import {
	daysOfPeriod,
	type Period,
	type PeriodPresetKey,
	periodOfPreset,
	type WeekStart
} from '@/core/lib/utils/dashboard-period';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';
import { logDurationSeconds, NO_PROJECT_VALUE, startOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { LIMIT_WEEK_START, WORK_DAYS_PER_WEEK } from '@/core/lib/utils/dashboards/weekly-limit';
import { employeeRateValueOf } from '@/core/lib/utils/rates';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

export type MyWeekPeriodKey = Extract<PeriodPresetKey, 'thisWeek' | 'lastWeek' | 'thisMonth'>;

export const MY_WEEK_PERIODS: ReadonlyArray<MyWeekPeriodKey> = ['thisWeek', 'lastWeek', 'thisMonth'];

export const DEFAULT_MY_WEEK_PERIOD: MyWeekPeriodKey = 'thisWeek';

/** The weeks Gauzy measures a weekly limit on, which are also the weeks of Timesheets. */
export const MY_WEEK_STARTS_ON: WeekStart = LIMIT_WEEK_START;

/** The entries the page lists under its figures; the Work diary holds every entry of a day. */
export const RECENT_ENTRY_COUNT = 8;

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

export function myWeekPeriodOf(key: MyWeekPeriodKey, now: Date): Period {
	return periodOfPreset(key, MY_WEEK_STARTS_ON, now);
}

export function isWeekPeriod(key: MyWeekPeriodKey) {
	return key !== 'thisMonth';
}

export interface MyWeekEntryProject {
	id: string;
	name: string;
	color: string | null;
	imageUrl: string | null;
}

export interface MyWeekEntry {
	id: string;
	log: ITimeLog;
	start: Date;
	/** The local day the entry started on. Its whole time counts on that day, the rule of Timesheets. */
	dayKey: string;
	seconds: number;
	isRunning: boolean;
	isBillable: boolean;
	/** Null for time tracked without a project, and for a project that came without a readable name. */
	project: MyWeekEntryProject | null;
}

function employeeIdOfLog(log: ITimeLog) {
	return log.employeeId ?? log.employee?.id ?? null;
}

function trimmedOrNull(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

function projectOfLog(log: ITimeLog): MyWeekEntryProject | null {
	const project = log.project;
	const name = trimmedOrNull(project?.name);
	if (!project || !name) {
		return null;
	}
	return {
		id: project.id,
		name,
		color: trimmedOrNull(project.color),
		imageUrl: trimmedOrNull(project.imageUrl)
	};
}

/** A running entry counts up to the read that returned it, so it grows with each live read. */
function runningSecondsOf(start: Date, now: Date) {
	const elapsedMilliseconds = now.getTime() - start.getTime();
	const elapsedSeconds = Math.round(elapsedMilliseconds / MILLISECONDS_PER_SECOND);
	return Math.max(0, elapsedSeconds);
}

function secondsOfLog(log: ITimeLog, start: Date, isRunning: boolean, now: Date) {
	if (isRunning) {
		return runningSecondsOf(start, now);
	}
	return logDurationSeconds(log);
}

function byNewestStart(first: MyWeekEntry, second: MyWeekEntry) {
	return second.start.getTime() - first.start.getTime();
}

/**
 * The member's own entries of a period, newest first. An entry belongs to the local day it started on, with its whole
 * time, so a week holds what Timesheets totals for it. Logs of anyone else are dropped: Gauzy answers a caller who may
 * not read the asked member with the caller's own logs, and the request asks a day more on each side of the period.
 */
export function myWeekEntriesOf(
	logs: ReadonlyArray<ITimeLog>,
	period: Period,
	employeeId: string | null,
	now: Date
): MyWeekEntry[] {
	if (!employeeId) {
		return [];
	}
	const firstKey = localDayKeyOf(period.from);
	const lastKey = localDayKeyOf(period.to);
	const entries: MyWeekEntry[] = [];
	for (const log of logs) {
		const isOwnLog = employeeIdOfLog(log) === employeeId;
		if (!isOwnLog) {
			continue;
		}
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const dayKey = localDayKeyOf(start);
		const startsBeforePeriod = dayKey < firstKey;
		const startsAfterPeriod = dayKey > lastKey;
		if (startsBeforePeriod || startsAfterPeriod) {
			continue;
		}
		const isRunning = log.isRunning === true;
		entries.push({
			id: log.id,
			log,
			start,
			dayKey,
			seconds: secondsOfLog(log, start, isRunning, now),
			isRunning,
			isBillable: log.isBillable === true,
			project: projectOfLog(log)
		});
	}
	entries.sort(byNewestStart);
	return entries;
}

export interface MyWeekDay {
	key: string;
	date: Date;
	seconds: number;
	isToday: boolean;
	isFuture: boolean;
}

function secondsByDayOf(entries: ReadonlyArray<MyWeekEntry>) {
	const secondsByDay = new Map<string, number>();
	for (const entry of entries) {
		const daySeconds = secondsByDay.get(entry.dayKey) ?? 0;
		secondsByDay.set(entry.dayKey, daySeconds + entry.seconds);
	}
	return secondsByDay;
}

export function myWeekDaysOf(period: Period, entries: ReadonlyArray<MyWeekEntry>, now: Date): MyWeekDay[] {
	const secondsByDay = secondsByDayOf(entries);
	const todayKey = localDayKeyOf(now);
	return daysOfPeriod(period).map((date) => {
		const key = localDayKeyOf(date);
		return {
			key,
			date,
			seconds: secondsByDay.get(key) ?? 0,
			isToday: key === todayKey,
			isFuture: key > todayKey
		};
	});
}

export interface MyWeekFigures {
	trackedSeconds: number;
	billableSeconds: number;
	/** Null while nothing is tracked: no time has no billable share. */
	billableShare: number | null;
	/** Null when the period does not hold today. */
	todaySeconds: number | null;
}

function billableShareOf(billableSeconds: number, trackedSeconds: number) {
	if (trackedSeconds <= 0) {
		return null;
	}
	return percentOf(billableSeconds, trackedSeconds);
}

function todaySecondsOf(days: ReadonlyArray<MyWeekDay>) {
	const today = days.find((day) => day.isToday);
	if (!today) {
		return null;
	}
	return today.seconds;
}

export function myWeekFiguresOf(entries: ReadonlyArray<MyWeekEntry>, days: ReadonlyArray<MyWeekDay>): MyWeekFigures {
	let trackedSeconds = 0;
	let billableSeconds = 0;
	for (const entry of entries) {
		trackedSeconds += entry.seconds;
		if (entry.isBillable) {
			billableSeconds += entry.seconds;
		}
	}
	return {
		trackedSeconds,
		billableSeconds,
		billableShare: billableShareOf(billableSeconds, trackedSeconds),
		todaySeconds: todaySecondsOf(days)
	};
}

/** The weekly limit of a member in seconds, from the hours on their employee profile; null when none is set. */
export function weeklyLimitSecondsOf(reWeeklyLimit: unknown): number | null {
	const hours = employeeRateValueOf(reWeeklyLimit);
	if (hours === null) {
		return null;
	}
	return hours * SECONDS_PER_HOUR;
}

/** What one day is measured against: a fifth of the weekly limit, as in the Weekly limit report. */
export function dailyLimitSecondsOf(weeklyLimitSeconds: number | null): number | null {
	if (weeklyLimitSeconds === null) {
		return null;
	}
	return weeklyLimitSeconds / WORK_DAYS_PER_WEEK;
}

export interface MyWeekTarget {
	limitSeconds: number;
	usedSeconds: number;
	share: number;
	verdict: LimitVerdict;
	/** Negative once the limit is passed. */
	remainingSeconds: number;
}

/** A week against the member's weekly limit. A month has no target, and neither has a member without a limit. */
export function myWeekTargetOf(
	key: MyWeekPeriodKey,
	weeklyLimitSeconds: number | null,
	usedSeconds: number
): MyWeekTarget | null {
	if (!isWeekPeriod(key)) {
		return null;
	}
	if (weeklyLimitSeconds === null) {
		return null;
	}
	return {
		limitSeconds: weeklyLimitSeconds,
		usedSeconds,
		share: percentOf(usedSeconds, weeklyLimitSeconds),
		verdict: limitVerdictOf(usedSeconds, weeklyLimitSeconds),
		remainingSeconds: weeklyLimitSeconds - usedSeconds
	};
}

function projectItemOf(project: MyWeekEntryProject | null): ProjectShareItem {
	if (!project) {
		return { key: NO_PROJECT_VALUE, name: null, imageUrl: null, color: null, isNoProject: true, seconds: 0 };
	}
	return {
		key: project.id,
		name: project.name,
		imageUrl: project.imageUrl,
		color: project.color,
		isNoProject: false,
		seconds: 0
	};
}

function byLongestThenName(first: ProjectShareItem, second: ProjectShareItem) {
	const secondsGap = second.seconds - first.seconds;
	if (secondsGap !== 0) {
		return secondsGap;
	}
	const firstName = first.name ?? '';
	const secondName = second.name ?? '';
	return firstName.localeCompare(secondName);
}

/** Every entry is in exactly one row, so the rows add up to the period's total. */
export function myWeekProjectsOf(entries: ReadonlyArray<MyWeekEntry>): ProjectShareItem[] {
	const byKey = new Map<string, ProjectShareItem>();
	for (const entry of entries) {
		const item = projectItemOf(entry.project);
		const known = byKey.get(item.key) ?? item;
		known.seconds += entry.seconds;
		byKey.set(item.key, known);
	}
	const projects = [...byKey.values()];
	projects.sort(byLongestThenName);
	return projects;
}

function wholeMinutesOf(seconds: number) {
	return Math.floor(seconds / SECONDS_PER_MINUTE);
}

function secondsPastTheMinuteOf(project: ProjectShareItem) {
	return project.seconds % SECONDS_PER_MINUTE;
}

function byClosestToNextMinute(first: ProjectShareItem, second: ProjectShareItem) {
	return secondsPastTheMinuteOf(second) - secondsPastTheMinuteOf(first);
}

/**
 * The projects with their time in whole minutes, the way every duration is written. Cut to the minute one by one they
 * could fall a few minutes short of the total written above them, so they are rounded together: each keeps its whole
 * minutes, and the minutes still missing go to the projects closest to their next minute.
 */
export function projectsInMinutesOf(projects: ReadonlyArray<ProjectShareItem>): ProjectShareItem[] {
	let totalSeconds = 0;
	let givenMinutes = 0;
	const minutesByKey = new Map<string, number>();
	for (const project of projects) {
		const minutes = wholeMinutesOf(project.seconds);
		totalSeconds += project.seconds;
		givenMinutes += minutes;
		minutesByKey.set(project.key, minutes);
	}
	let missingMinutes = wholeMinutesOf(totalSeconds) - givenMinutes;
	const closestFirst = [...projects].sort(byClosestToNextMinute);
	for (const project of closestFirst) {
		if (missingMinutes <= 0) {
			break;
		}
		const minutes = minutesByKey.get(project.key) ?? 0;
		minutesByKey.set(project.key, minutes + 1);
		missingMinutes -= 1;
	}
	const inMinutes = projects.map((project) => {
		const minutes = minutesByKey.get(project.key) ?? 0;
		return { ...project, seconds: minutes * SECONDS_PER_MINUTE };
	});
	inMinutes.sort(byLongestThenName);
	return inMinutes;
}

export function namedProjectCountOf(projects: ReadonlyArray<ProjectShareItem>) {
	const namedProjects = projects.filter((project) => !project.isNoProject);
	return namedProjects.length;
}

export function taskIdOfEntry(entry: MyWeekEntry): string | null {
	return entry.log.task?.id ?? entry.log.taskId ?? null;
}
