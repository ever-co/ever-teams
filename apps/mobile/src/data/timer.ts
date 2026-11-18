import { serverFetch } from '../../app/services/client/fetch';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import type { Session } from '../state/session';

/** The time log the status names: the one running, or the last one of the day. */
export interface TimerLog {
	startedAt: string;
	stoppedAt?: string | null;
	source?: TimerSource;
	taskId?: string | null;
	organizationTeamId?: string | null;
}

/** What `/timesheet/timer/status` answers: today's tracked seconds, and whether a log runs. */
export interface TimerStatus {
	duration: number;
	running: boolean;
	lastLog?: TimerLog;
}

/** The person's tracked seconds this week and today, as `/timesheet/statistics/counts` answers them. */
export interface TrackedTotals {
	weekDuration: number;
	todayDuration: number;
}

/** An answer the API refused: its HTTP status, for the screens to say what happened. */
export class ApiError extends Error {
	constructor(readonly status: number) {
		super(`The API answered ${status}`);
		this.name = 'ApiError';
	}
}

interface Answer<T> {
	data: T;
	response: Response;
}

function answerOf<T>(answer: Answer<T>): T {
	if (!answer.response.ok) {
		throw new ApiError(answer.response.status);
	}
	return answer.data;
}

function startOfDay(moment: Date): Date {
	const start = new Date(moment);
	start.setHours(0, 0, 0, 0);
	return start;
}

function endOfDay(moment: Date): Date {
	const end = new Date(moment);
	end.setHours(23, 59, 59, 999);
	return end;
}

/**
 * The person's own day. Without these bounds Gauzy counts "today" from the API server's midnight, which is not the
 * person's when they live in another time zone; the web sends the same ones.
 */
export function dayBounds(now: Date): { start: Date; end: Date } {
	return { start: startOfDay(now), end: endOfDay(now) };
}

const DAYS_SINCE_MONDAY = [6, 0, 1, 2, 3, 4, 5];

/** The week so far, from Monday at midnight to the end of today, in the person's own time. */
export function weekBounds(now: Date): { start: Date; end: Date } {
	const monday = startOfDay(now);
	monday.setDate(monday.getDate() - DAYS_SINCE_MONDAY[monday.getDay()]);
	return { start: monday, end: endOfDay(now) };
}

function workspaceOf(session: Session): { tenantId: string; organizationId: string } {
	return { tenantId: session.tenantId ?? '', organizationId: session.organizationId ?? '' };
}

/** Reads the timer and today's tracked seconds. */
export async function readTimerStatus(session: Session, now: Date): Promise<TimerStatus> {
	const { tenantId, organizationId } = workspaceOf(session);
	const { start, end } = dayBounds(now);
	const query = new URLSearchParams({
		tenantId,
		organizationId,
		todayStart: start.toISOString(),
		todayEnd: end.toISOString()
	});
	const answer = await serverFetch<TimerStatus>({
		path: `/timesheet/timer/status?${query.toString()}`,
		method: 'GET',
		bearer_token: session.accessToken,
		tenantId
	});
	return answerOf(answer);
}

/** Reads the person's tracked seconds this week and today. */
export async function readTrackedTotals(session: Session, employeeId: string, now: Date): Promise<TrackedTotals> {
	const { tenantId, organizationId } = workspaceOf(session);
	const week = weekBounds(now);
	const query = new URLSearchParams({
		tenantId,
		organizationId,
		startDate: week.start.toISOString(),
		endDate: week.end.toISOString(),
		'employeeIds[0]': employeeId
	});
	const answer = await serverFetch<TrackedTotals>({
		path: `/timesheet/statistics/counts?${query.toString()}`,
		method: 'GET',
		bearer_token: session.accessToken,
		tenantId
	});
	return answerOf(answer);
}

/** The id of the employee the signed-in person is in this organization. */
export async function readEmployeeId(session: Session): Promise<string | null> {
	const query = new URLSearchParams({ 'relations[0]': 'employee', includeEmployee: 'true' });
	const answer = await serverFetch<{ employee?: { id?: string } | null }>({
		path: `/user/me?${query.toString()}`,
		method: 'GET',
		bearer_token: session.accessToken,
		tenantId: session.tenantId
	});
	return answerOf(answer).employee?.id ?? null;
}

/** The task a log names, as the screens show it: its number (HAR-3) and its title. */
export interface TimerTask {
	taskNumber?: string | null;
	title: string;
}

/** Reads the task a log names. */
export async function readTask(session: Session, taskId: string): Promise<TimerTask> {
	const { tenantId, organizationId } = workspaceOf(session);
	const query = new URLSearchParams({ tenantId, organizationId });
	const answer = await serverFetch<TimerTask>({
		path: `/tasks/${encodeURIComponent(taskId)}?${query.toString()}`,
		method: 'GET',
		bearer_token: session.accessToken,
		tenantId
	});
	const task = answerOf(answer);
	return { taskNumber: task.taskNumber ?? null, title: task.title };
}

/** What a start needs besides the session: the task and team of the log it continues. */
export interface StartTarget {
	taskId: string;
	organizationTeamId?: string | null;
}

function teamOf(target: StartTarget): { organizationTeamId?: string } {
	if (!target.organizationTeamId) {
		return {};
	}
	return { organizationTeamId: target.organizationTeamId };
}

/** Starts the timer on a task, as the current app does: a tracked log from the phone. */
export async function startTimer(session: Session, target: StartTarget): Promise<void> {
	const { tenantId, organizationId } = workspaceOf(session);
	const answer = await serverFetch<unknown>({
		path: '/timesheet/timer/start',
		method: 'POST',
		body: {
			tenantId,
			organizationId,
			taskId: target.taskId,
			logType: 'TRACKED',
			source: TimerSource.MOBILE,
			tags: [],
			...teamOf(target)
		},
		bearer_token: session.accessToken,
		tenantId
	});
	answerOf(answer);
}

// The API answers 406 when nothing runs anymore: the timer was stopped from another device, which is what was asked
const NOTHING_RUNNING = 406;

/**
 * Stops the timer. The stop names the source of the running log, as the current app does, so a timer started from
 * another app stops too.
 */
export async function stopTimer(session: Session, running: TimerLog | undefined): Promise<void> {
	const { tenantId, organizationId } = workspaceOf(session);
	const answer = await serverFetch<unknown>({
		path: '/timesheet/timer/stop',
		method: 'POST',
		body: {
			tenantId,
			organizationId,
			taskId: running?.taskId ?? undefined,
			logType: 'TRACKED',
			source: running?.source ?? TimerSource.MOBILE,
			tags: []
		},
		bearer_token: session.accessToken,
		tenantId
	});
	if (answer.response.status === NOTHING_RUNNING) {
		return;
	}
	answerOf(answer);
}
