import { publicRequest, sessionRequest } from '~lib/api-client';
import { idListOf, optionalField } from '~lib/optional';
import type { PlanLike } from '~lib/plan-rule';
import { EXTENSION_SOURCE, heartbeatSecondsOf } from '~lib/run-policy';
import { sessionFrom, workspacesOf, type Session, type WorkspaceChoice } from '~lib/workspaces';

export { EXTENSION_SOURCE };

export interface TaskItem {
	id: string;
	title: string;
	taskNumber?: string | null;
	prefix?: string | null;
	projectId?: string | null;
	estimate?: number | null;
	updatedAt?: string | null;
}

export interface RunningLog {
	id: string;
	startedAt: string;
	stoppedAt?: string | null;
	taskId?: string | null;
	source?: string | null;
	task?: { title?: string | null } | null;
}

/** The timer as `GET /timesheet/timer/status` answers it: whether a run goes on, and today's worked seconds. */
export interface TimerStatus {
	running: boolean;
	duration: number;
	lastLog: RunningLog | null;
}

// --- Sign-in, the same email code steps as the web ---

/** Sends a sign-in code to the email. */
export async function sendSignInCode(apiUrl: string, email: string): Promise<void> {
	await publicRequest(apiUrl, '/auth/signin.email', { method: 'POST', body: { email } });
}

/** Confirms the code and answers the workspaces it opens. */
export async function confirmSignInCode(apiUrl: string, email: string, code: string): Promise<WorkspaceChoice[]> {
	const answer = await publicRequest<unknown>(apiUrl, '/auth/signin.email/confirm', {
		method: 'POST',
		body: { email, code, includeTeams: true }
	});
	return workspacesOf(answer);
}

/** Enters one workspace; null when the API answered no session. */
export async function enterWorkspace(apiUrl: string, email: string, workspace: WorkspaceChoice): Promise<Session | null> {
	const answer = await publicRequest<unknown>(apiUrl, '/auth/signin.workspace', {
		method: 'POST',
		body: { email, token: workspace.token, ...optionalField('teamId', workspace.lastTeamId) }
	});
	return sessionFrom(answer, workspace, apiUrl);
}

// --- Timer ---

/** Today's bounds in the person's own day: without them the API counts "today" from its server's midnight. */
function todayRange(now = new Date()): { todayStart: string; todayEnd: string } {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(now);
	end.setHours(23, 59, 59, 999);
	return { todayStart: start.toISOString(), todayEnd: end.toISOString() };
}

/** The person's day as YYYY-MM-DD, the plan day the web sends with a start. */
export function todayPlanDay(now = new Date()): string {
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}

export async function getTimerStatus(session: Session): Promise<TimerStatus> {
	return sessionRequest<TimerStatus>(session, '/timesheet/timer/status', {
		query: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			'relations[0]': 'task',
			...todayRange()
		}
	});
}

/** Starts the real timer on a task, as the web does, with the browser extension as its source. */
export async function startTimer(session: Session, task: TaskItem): Promise<void> {
	await sessionRequest(session, '/timesheet/timer/start', {
		method: 'POST',
		body: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			taskId: task.id,
			// Reports read the project from the time log: a log saved without it shows under no project
			...optionalField('projectId', task.projectId),
			organizationTeamId: session.teamId ?? undefined,
			logType: 'TRACKED',
			source: EXTENSION_SOURCE,
			tags: [],
			planDay: todayPlanDay()
		}
	});
}

/**
 * Credits the run's time since its last heartbeat as a time slot, as the web does each minute: worked-time totals,
 * reports and the Work diary count a run's time from its slots.
 */
export async function sendHeartbeat(session: Session, run: RunningLog, now = Date.now()): Promise<void> {
	const duration = heartbeatSecondsOf(run, now);
	if (duration === 0) {
		return;
	}
	await sessionRequest(session, '/timesheet/time-slot', {
		method: 'POST',
		body: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			...optionalField('employeeId', session.employeeId),
			timeLogId: run.id,
			logType: 'TRACKED',
			source: EXTENSION_SOURCE,
			duration
		}
	});
}

/** Stops the run the popup shows; a 409 means another run replaced it meanwhile and goes on. */
export async function stopTimer(session: Session, timeLogId: string): Promise<void> {
	await sessionRequest(session, '/timesheet/timer/stop', {
		method: 'POST',
		body: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			logType: 'TRACKED',
			source: EXTENSION_SOURCE,
			timeLogId
		}
	});
}

// --- Tasks and plans ---

/** The person's tasks of the active team. */
export async function listTasks(session: Session): Promise<TaskItem[]> {
	if (!session.employeeId) {
		return [];
	}
	const answer = await sessionRequest<unknown>(session, `/tasks/employee/${session.employeeId}`, {
		query: {
			'where[tenantId]': session.tenantId,
			'where[organizationId]': session.organizationId,
			...optionalField('where[teams][id]', session.teamId)
		}
	});
	if (!Array.isArray(answer)) {
		return [];
	}
	return answer as TaskItem[];
}

/** Creates a task in the active team, given to the person, with an estimate in seconds. */
export async function createTask(session: Session, title: string, estimate: number): Promise<TaskItem> {
	return sessionRequest<TaskItem>(session, '/tasks', {
		method: 'POST',
		body: {
			title,
			description: '',
			status: 'open',
			estimate,
			tags: [],
			teams: idListOf(session.teamId),
			members: idListOf(session.employeeId),
			organizationId: session.organizationId,
			tenantId: session.tenantId
		}
	});
}

/** Whether the active team requires a daily plan before its members track time. */
export async function teamRequiresPlan(session: Session): Promise<boolean> {
	if (!session.teamId) {
		return false;
	}
	const team = await sessionRequest<{ requirePlanToTrack?: boolean }>(session, `/organization-team/${session.teamId}`, {
		query: { organizationId: session.organizationId, tenantId: session.tenantId }
	});
	return team?.requirePlanToTrack === true;
}

/** The person's daily plans in the active team, with their tasks. */
export async function myPlans(session: Session): Promise<PlanLike[]> {
	const answer = await sessionRequest<{ items?: PlanLike[] }>(session, '/daily-plan/me', {
		query: {
			'where[organizationId]': session.organizationId,
			'where[tenantId]': session.tenantId,
			...optionalField('where[organizationTeamId]', session.teamId),
			'relations[0]': 'tasks'
		}
	});
	return answer?.items ?? [];
}
