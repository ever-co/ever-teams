import { addDays, set, startOfDay } from 'date-fns';
import {
	endOfLog,
	isOwnLog,
	logDurationSeconds,
	type LogOwner,
	startOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { OverlapSummary } from './time-log-overlap';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;
const HOURS_PER_HALF_DAY = 12;

export const RECENT_WORK_LIMIT = 5;

export const RECENT_WORK_DAYS = 14;

/** The Add time dialog takes its times to the minute. */
export const ADD_TIME_STEP_MINUTES = 1;

/** The Add time entry dialog of Timesheets offers its times every five minutes. */
export const ADD_TIME_ENTRY_STEP_MINUTES = 5;

export interface TimeWindow {
	start: Date;
	end: Date;
}

export function taskIdOfLog(log: ITimeLog): string | null {
	return log.task?.id ?? log.taskId ?? null;
}

export function tasksByIdOf(tasks: ReadonlyArray<TTask>): Map<string, TTask> {
	const byId = new Map<string, TTask>();
	for (const task of tasks) {
		byId.set(task.id, task);
	}
	return byId;
}

export interface ContinueViewer extends LogOwner {
	/** The member's tracking switches are on and their account may start a timer. */
	canTrackTime: boolean;
}

/**
 * The task a Continue on this entry starts the timer on. Null where Continue is not offered: the viewer cannot track
 * time, the entry is someone else's, it is the one the timer is recording, it has no task, its task is no longer
 * one of the team's, or that task is closed, which the timer refuses to start.
 */
export function continuableTaskOf(
	log: ITimeLog,
	viewer: ContinueViewer,
	reachableTasks: ReadonlyMap<string, TTask>
): TTask | null {
	if (!viewer.canTrackTime) {
		return null;
	}
	const isOwn = isOwnLog(log, viewer);
	if (!isOwn) {
		return null;
	}
	if (log.isRunning) {
		return null;
	}
	const taskId = taskIdOfLog(log);
	if (!taskId) {
		return null;
	}
	const task = reachableTasks.get(taskId);
	if (!task) {
		return null;
	}
	const isClosed = task.status === ETaskStatusName.CLOSED;
	if (isClosed) {
		return null;
	}
	return task;
}

export interface TimerCarry {
	isBillable: boolean;
	description: string | null;
}

/** What a continued entry hands to the timer besides its task. */
export function timerCarryOf(log: ITimeLog): TimerCarry {
	const notes = log.description?.trim();
	const isBillable = Boolean(log.isBillable);
	if (!notes) {
		return { isBillable, description: null };
	}
	return { isBillable, description: notes };
}

function startTimeOf(log: ITimeLog) {
	const start = startOfLog(log);
	if (!start) {
		return 0;
	}
	return start.getTime();
}

function byLatestStart(first: ITimeLog, second: ITimeLog) {
	return startTimeOf(second) - startTimeOf(first);
}

/**
 * The latest entry of a task among some entries: the one a row that adds the task's entries up speaks for when it
 * is continued or copied.
 */
export function latestLogOfTask(logs: ReadonlyArray<ITimeLog>, taskId: string): ITimeLog | null {
	const taskLogs = logs.filter((log) => taskIdOfLog(log) === taskId);
	const latestFirst = [...taskLogs].sort(byLatestStart);
	return latestFirst[0] ?? null;
}

export interface RecentTask {
	task: TTask;
	projectName: string | null;
	projectColor: string | null;
	projectImageUrl: string | null;
}

function recentTaskOf(task: TTask, log: ITimeLog): RecentTask {
	const project = log.project;
	return {
		task,
		projectName: project?.name ?? null,
		projectColor: project?.color ?? null,
		projectImageUrl: project?.imageUrl ?? null
	};
}

/**
 * The tasks the member tracked last, most recent first, each once and with the project of its latest entry. A task
 * that is no longer one of the team's is left out, and so is a closed one, which the timer cannot start.
 */
export function recentTasksOf(
	logs: ReadonlyArray<ITimeLog>,
	reachableTasks: ReadonlyMap<string, TTask>,
	limit: number = RECENT_WORK_LIMIT
): RecentTask[] {
	const latestFirst = [...logs].sort(byLatestStart);
	const seenTaskIds = new Set<string>();
	const recent: RecentTask[] = [];
	for (const log of latestFirst) {
		const isFull = recent.length >= limit;
		if (isFull) {
			break;
		}
		const taskId = taskIdOfLog(log);
		if (!taskId) {
			continue;
		}
		const isRepeated = seenTaskIds.has(taskId);
		if (isRepeated) {
			continue;
		}
		seenTaskIds.add(taskId);
		const task = reachableTasks.get(taskId);
		if (!task) {
			continue;
		}
		const isClosed = task.status === ETaskStatusName.CLOSED;
		if (isClosed) {
			continue;
		}
		recent.push(recentTaskOf(task, log));
	}
	return recent;
}

/** What a copied entry fills an Add time dialog with, besides its interval. */
export interface CopiedFields {
	taskId: string;
	projectId: string;
	employeeId: string;
	isBillable: boolean;
	description: string;
}

export interface TimeEntryCopy extends CopiedFields {
	start: Date;
	end: Date;
}

export function copiedFieldsOf(log: ITimeLog): CopiedFields {
	const notes = log.description?.trim();
	return {
		taskId: taskIdOfLog(log) ?? '',
		projectId: log.project?.id ?? log.projectId ?? '',
		employeeId: log.employee?.id ?? log.employeeId ?? '',
		isBillable: Boolean(log.isBillable),
		description: notes ?? ''
	};
}

export interface TimeEntrySaveCheck {
	/** The member the time is saved for. */
	employeeId: string;
	periods: ReadonlyArray<TimeWindow>;
}

/** Asked by an Add time dialog before it saves: a returned message refuses the save and is shown to the member. */
export type CheckTimeEntrySave = (check: TimeEntrySaveCheck) => Promise<string | null>;

/**
 * The refusal an Add time dialog shows for a copied entry whose save, checked again just before it is sent, runs over
 * an entry recorded since `CheckTimeEntrySave` answered: a copy is never offered to be saved over it.
 */
export type RefuseTimeEntryOverlap = (overlap: OverlapSummary) => string;

function stepSecondsOf(stepMinutes: number) {
	return stepMinutes * SECONDS_PER_MINUTE;
}

function stepMillisecondsOf(stepMinutes: number) {
	return stepSecondsOf(stepMinutes) * MILLISECONDS_PER_SECOND;
}

function secondsAfter(date: Date, seconds: number) {
	const time = date.getTime() + seconds * MILLISECONDS_PER_SECOND;
	return new Date(time);
}

function secondsBefore(date: Date, seconds: number) {
	const time = date.getTime() - seconds * MILLISECONDS_PER_SECOND;
	return new Date(time);
}

function flooredToStep(date: Date, stepMinutes: number) {
	const stepMilliseconds = stepMillisecondsOf(stepMinutes);
	const steps = Math.floor(date.getTime() / stepMilliseconds);
	return new Date(steps * stepMilliseconds);
}

function raisedToStep(date: Date, stepMinutes: number) {
	const stepMilliseconds = stepMillisecondsOf(stepMinutes);
	const steps = Math.ceil(date.getTime() / stepMilliseconds);
	return new Date(steps * stepMilliseconds);
}

/**
 * How long a copy lasts: the entry's time in whole steps of the dialog it opens in (a minute, or five), one step at
 * least, and short enough to hold in one day, since the dialogs keep an entry on one date.
 */
export function copySecondsOf(seconds: number, stepMinutes: number): number {
	const stepSeconds = stepSecondsOf(stepMinutes);
	const longestSeconds = HOURS_PER_DAY * SECONDS_PER_HOUR - stepSeconds;
	const steps = Math.round(seconds / stepSeconds);
	const wholeSteps = Math.max(1, steps);
	return Math.min(wholeSteps * stepSeconds, longestSeconds);
}

/** An entry the timer is recording holds its time up to now, whatever end its last heartbeat wrote. */
function busyEndOf(log: ITimeLog, start: Date, now: Date): Date {
	if (log.isRunning) {
		return now;
	}
	const end = endOfLog(log);
	if (end) {
		return end;
	}
	const seconds = logDurationSeconds(log);
	return secondsAfter(start, seconds);
}

function busyWindowOf(log: ITimeLog, now: Date): TimeWindow | null {
	const start = startOfLog(log);
	if (!start) {
		return null;
	}
	const end = busyEndOf(log, start, now);
	const holdsTime = end.getTime() > start.getTime();
	if (!holdsTime) {
		return null;
	}
	return { start, end };
}

/**
 * The entries with the one the member's timer is recording. The API lists an entry once it holds a first time slot,
 * so a timer started a moment ago is missing from what was read, while it already holds its time.
 */
export function withRunningLog(logs: ReadonlyArray<ITimeLog>, runningLog: ITimeLog | null | undefined): ITimeLog[] {
	if (!runningLog) {
		return [...logs];
	}
	const isListed = logs.some((log) => log.id === runningLog.id);
	if (isListed) {
		return [...logs];
	}
	return [...logs, { ...runningLog, isRunning: true }];
}

function busyWindowsOf(logs: ReadonlyArray<ITimeLog>, now: Date): TimeWindow[] {
	const windows: TimeWindow[] = [];
	for (const log of logs) {
		const window = busyWindowOf(log, now);
		if (window) {
			windows.push(window);
		}
	}
	return windows;
}

function windowsOverlap(first: TimeWindow, second: TimeWindow) {
	const startsBeforeEnd = first.start.getTime() < second.end.getTime();
	const endsAfterStart = first.end.getTime() > second.start.getTime();
	return startsBeforeEnd && endsAfterStart;
}

/** The first entry the interval would run over, or null when it runs over none. */
export function overlappedLogOf(interval: TimeWindow, logs: ReadonlyArray<ITimeLog>, now: Date): ITimeLog | null {
	for (const log of logs) {
		const window = busyWindowOf(log, now);
		if (!window) {
			continue;
		}
		if (windowsOverlap(interval, window)) {
			return log;
		}
	}
	return null;
}

function byWindowStart(first: TimeWindow, second: TimeWindow) {
	return first.start.getTime() - second.start.getTime();
}

function endingBy(window: TimeWindow, until: Date): TimeWindow | null {
	const endTime = Math.min(window.end.getTime(), until.getTime());
	const isEmpty = endTime <= window.start.getTime();
	if (isEmpty) {
		return null;
	}
	return { start: window.start, end: new Date(endTime) };
}

function freeWindowsOf(busy: ReadonlyArray<TimeWindow>, from: Date, until: Date): TimeWindow[] {
	const sorted = [...busy].sort(byWindowStart);
	const gaps: TimeWindow[] = [];
	let cursor = from;
	for (const window of sorted) {
		const startsAfterCursor = window.start.getTime() > cursor.getTime();
		if (startsAfterCursor) {
			gaps.push({ start: cursor, end: window.start });
		}
		const endsAfterCursor = window.end.getTime() > cursor.getTime();
		if (endsAfterCursor) {
			cursor = window.end;
		}
	}
	gaps.push({ start: cursor, end: until });

	const free: TimeWindow[] = [];
	for (const gap of gaps) {
		const window = endingBy(gap, until);
		if (window) {
			free.push(window);
		}
	}
	return free;
}

function sameTimeOfDayOf(sourceStart: Date, dayStart: Date, seconds: number, stepMinutes: number): TimeWindow {
	const wholeSteps = Math.floor(sourceStart.getMinutes() / stepMinutes);
	const minutes = wholeSteps * stepMinutes;
	const start = set(dayStart, { hours: sourceStart.getHours(), minutes, seconds: 0, milliseconds: 0 });
	const end = secondsAfter(start, seconds);
	return { start, end };
}

/**
 * Whether the Add time dialog, which keeps a time as an hour and a minute of its day and reads it back as the first
 * moment with that time, saves this moment as it is. On the day the clock goes back an hour comes twice: a moment of
 * its second run would be saved an hour earlier, and the copy an hour shorter.
 */
function isKeptByDialog(moment: Date, dayStart: Date) {
	const clockTime = { hours: moment.getHours(), minutes: moment.getMinutes(), seconds: 0, milliseconds: 0 };
	const readBack = set(dayStart, clockTime);
	return readBack.getTime() === moment.getTime();
}

function isKeptCopy(copy: TimeWindow) {
	const dayStart = startOfDay(copy.start);
	return isKeptByDialog(copy.start, dayStart) && isKeptByDialog(copy.end, dayStart);
}

/** The latest copy that fits in a free stretch and that the dialog saves as it is, one step earlier at a time. */
function latestKeptCopyIn(window: TimeWindow, seconds: number, stepMinutes: number): TimeWindow | null {
	const start = raisedToStep(window.start, stepMinutes);
	const stepSeconds = stepSecondsOf(stepMinutes);
	let copyEnd = flooredToStep(window.end, stepMinutes);
	let copyStart = secondsBefore(copyEnd, seconds);
	while (copyStart.getTime() >= start.getTime()) {
		const copy = { start: copyStart, end: copyEnd };
		if (isKeptCopy(copy)) {
			return copy;
		}
		copyEnd = secondsBefore(copyEnd, stepSeconds);
		copyStart = secondsBefore(copyEnd, seconds);
	}
	return null;
}

function latestFreeIntervalOf(
	free: ReadonlyArray<TimeWindow>,
	seconds: number,
	stepMinutes: number
): TimeWindow | null {
	const latestFirst = [...free].reverse();
	for (const window of latestFirst) {
		const copy = latestKeptCopyIn(window, seconds, stepMinutes);
		if (copy) {
			return copy;
		}
	}
	return null;
}

export interface DuplicatePlacement {
	/** How long the copy lasts, in whole steps (see `copySecondsOf`). */
	seconds: number;
	/** When the copied entry started: the copy keeps its time of day when that time is free today. */
	sourceStart: Date | null;
	/** The entries of the member the copy is for, around today. */
	memberLogs: ReadonlyArray<ITimeLog>;
	now: Date;
	stepMinutes: number;
}

/**
 * Where a copy goes today so that it runs over no entry of the member and ends by now: at the copied entry's own
 * time of day when that is free, otherwise at the end of the latest free stretch long enough. Null when today holds
 * no such stretch.
 */
export function duplicateIntervalOf(placement: DuplicatePlacement): TimeWindow | null {
	const { seconds, sourceStart, memberLogs, now, stepMinutes } = placement;
	const dayStart = startOfDay(now);
	const latestEnd = flooredToStep(now, stepMinutes);
	const busy = busyWindowsOf(memberLogs, now);

	if (sourceStart) {
		const sameTime = sameTimeOfDayOf(sourceStart, dayStart, seconds, stepMinutes);
		const endsByNow = sameTime.end.getTime() <= latestEnd.getTime();
		const runsOverEntry = busy.some((window) => windowsOverlap(sameTime, window));
		const isFree = !runsOverEntry;
		if (endsByNow && isFree && isKeptCopy(sameTime)) {
			return sameTime;
		}
	}

	const free = freeWindowsOf(busy, dayStart, latestEnd);
	return latestFreeIntervalOf(free, seconds, stepMinutes);
}

/**
 * Where a copy opens when today has no free stretch for it: at the copied entry's own time of day, moved earlier when
 * it would pass midnight. It runs over an entry or ends after now, so the dialog refuses it until the member moves it.
 */
export function unplacedIntervalOf(
	sourceStart: Date | null,
	seconds: number,
	now: Date,
	stepMinutes: number
): TimeWindow {
	const dayStart = startOfDay(now);
	const nextDayStart = addDays(dayStart, 1);
	const stepSeconds = stepSecondsOf(stepMinutes);
	const lastEnd = secondsBefore(nextDayStart, stepSeconds);
	const latestStart = secondsBefore(lastEnd, seconds);
	const timeOfDay = sourceStart ?? now;
	const sameTime = sameTimeOfDayOf(timeOfDay, dayStart, seconds, stepMinutes);
	const startsTooLate = sameTime.start.getTime() > latestStart.getTime();
	if (startsTooLate) {
		return { start: latestStart, end: lastEnd };
	}
	return sameTime;
}

function twoDigits(value: number) {
	return String(value).padStart(2, '0');
}

function hourOnClockOf(hours: number) {
	const hourOfHalf = hours % HOURS_PER_HALF_DAY;
	if (hourOfHalf === 0) {
		return HOURS_PER_HALF_DAY;
	}
	return hourOfHalf;
}

function halfOfDayOf(hours: number) {
	if (hours >= HOURS_PER_HALF_DAY) {
		return 'PM';
	}
	return 'AM';
}

/** `02:05:00 PM`, how the Add time entry dialog of Timesheets writes its time choices. */
export function timeChoiceOf(date: Date): string {
	const hours = date.getHours();
	const hourText = twoDigits(hourOnClockOf(hours));
	const minuteText = twoDigits(date.getMinutes());
	const half = halfOfDayOf(hours);
	return `${hourText}:${minuteText}:00 ${half}`;
}

/** `01:30h`, how that dialog writes the length of a period. */
export function periodLengthOf(seconds: number): string {
	const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
	const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
	const minutes = totalMinutes % MINUTES_PER_HOUR;
	return `${twoDigits(hours)}:${twoDigits(minutes)}h`;
}

export interface AddTimeTaskViewer {
	teamId: string | undefined;
	userId: string | undefined;
	isTeamManager: boolean;
}

function isTaskMember(task: TTask, userId: string | undefined) {
	if (!userId) {
		return false;
	}
	const members = task.members ?? [];
	return members.some((member) => member?.userId === userId);
}

/**
 * Whether the Add time dialog of the Work diary offers a task, by the rule of its own task list: a task of the active
 * team and, for a member who does not manage that team, one assigned to them. A copy of an entry on a task it does
 * not offer would open without its task.
 */
export function isTaskOfferedToAddTime(
	taskId: string,
	tasks: ReadonlyArray<TTask>,
	viewer: AddTimeTaskViewer
): boolean {
	const task = tasks.find((item) => item.id === taskId);
	const isListable = Boolean(task?.title) && Array.isArray(task?.teams);
	if (!task || !isListable) {
		return false;
	}
	const teams = task.teams ?? [];
	const isOfTeam = Boolean(viewer.teamId) && teams.some((team) => team?.id === viewer.teamId);
	if (!isOfTeam) {
		return false;
	}
	return viewer.isTeamManager || isTaskMember(task, viewer.userId);
}

/** What the page's Add time dialog lets a copy keep: the tasks it offers, and the members it adds time for. */
export interface DuplicateTargets {
	tasks: ReadonlyArray<Pick<TTask, 'id'>>;
	members: ReadonlyArray<{ employeeId?: string | null }>;
}

/**
 * Whether a page offers Duplicate on an entry. The copy opens the page's Add time dialog, so it follows who that dialog
 * adds time for: a viewer who adds their own time only (`ownOnlyEmployeeId`, #5136) duplicates their own entries, never
 * a teammate's. Given what that dialog offers (`targets`), an entry is copied only when the dialog can keep its task
 * and its member (an entry of another team, or without a task, would open as an empty form): a fixed member is the
 * one the copy is saved for, whatever the list.
 */
export function canDuplicateLog(
	log: ITimeLog,
	canAddTime: boolean,
	ownOnlyEmployeeId: string | null,
	targets?: DuplicateTargets
): boolean {
	if (!canAddTime) {
		return false;
	}
	const { taskId, employeeId } = copiedFieldsOf(log);
	const isOwnOnly = Boolean(ownOnlyEmployeeId);
	if (isOwnOnly && employeeId !== ownOnlyEmployeeId) {
		return false;
	}
	if (!targets) {
		return true;
	}
	const isTaskOffered = targets.tasks.some((task) => task.id === taskId);
	const isMemberOffered = isOwnOnly || targets.members.some((member) => member.employeeId === employeeId);
	return isTaskOffered && isMemberOffered;
}
