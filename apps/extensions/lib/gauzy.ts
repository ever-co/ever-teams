import { publicRequest, sessionRequest } from '~lib/api-client';
import { idListOf, optionalField } from '~lib/optional';
import type { PlanLike } from '~lib/plan-rule';
import { EXTENSION_SOURCE, heartbeatSecondsOf, stopSourceOf } from '~lib/run-policy';
import type { TwoFactorProof } from '~lib/two-factor';
import { activeTeamIdOf, sessionFrom, workspacesOf, type Session, type WorkspaceChoice } from '~lib/workspaces';

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
	isRunning?: boolean | null;
}

/** What a caller may give a call to the API: a signal that cancels it (the background's deadline). */
export interface CallOptions {
	signal?: AbortSignal;
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

/**
 * Enters one workspace; null when the API answered no session. The workspace token the confirmed code answered is the
 * proof: the code is not sent again. The team the session opens goes as `lastTeamId`, as the web sends the team chosen
 * (Gauzy keeps it as the person's last team, and drops any field it does not read).
 */
export async function enterWorkspace(
	apiUrl: string,
	email: string,
	workspace: WorkspaceChoice
): Promise<Session | null> {
	const answer = await publicRequest<unknown>(apiUrl, '/auth/signin.workspace', {
		method: 'POST',
		body: { email, token: workspace.token, ...optionalField('lastTeamId', activeTeamIdOf(workspace)) }
	});
	return sessionFrom(answer, workspace, apiUrl);
}

/**
 * Completes a workspace sign-in that asked for the two-factor code: the challenge it answered and the code (or a
 * recovery code) are traded for the session (`POST /auth/two-factor/verify`); null when the API answered no session.
 */
export async function verifySignInCode(
	apiUrl: string,
	challenge: string,
	proof: TwoFactorProof,
	workspace: WorkspaceChoice
): Promise<Session | null> {
	const answer = await publicRequest<unknown>(apiUrl, '/auth/two-factor/verify', {
		method: 'POST',
		body: { challenge, ...proof }
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

/**
 * The person's timer. The day's status of a Gauzy older than its past-midnight fix leaves out a run started before
 * midnight: as the web's timer does (readRunGoingOn), the person's last log of any day is read then, and a run it
 * shows still going is put in the day's status. Without it the run vanished at midnight: Start showed, the badge
 * cleared and the heartbeats stopped. A failed read of the last log leaves the day's status as it is.
 */
export async function getTimerStatus(session: Session, call: CallOptions = {}): Promise<TimerStatus> {
	const status = await sessionRequest<TimerStatus>(session, '/timesheet/timer/status', {
		query: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			'relations[0]': 'task',
			...todayRange()
		},
		signal: call.signal
	});
	if (status?.running || !session.employeeId) {
		return status;
	}
	const lastLog = await lastLogOf(session, session.employeeId, call).catch((error: unknown) => {
		// Cancelled, the whole read is: the day's status alone would show a run past midnight as stopped
		if (call.signal?.aborted) {
			throw error;
		}
		return null;
	});
	if (!lastLog?.isRunning) {
		return status;
	}
	return { ...status, running: true, lastLog };
}

/** The person's last log of any day (`GET /timesheet/timer/status/worked`), or null when Gauzy names none. */
async function lastLogOf(session: Session, employeeId: string, call: CallOptions): Promise<RunningLog | null> {
	const statuses = await sessionRequest<Array<{ lastLog?: RunningLog | null }>>(
		session,
		'/timesheet/timer/status/worked',
		{
			query: { tenantId: session.tenantId, organizationId: session.organizationId, employeeId },
			signal: call.signal
		}
	);
	return statuses?.[0]?.lastLog ?? null;
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
export async function sendHeartbeat(session: Session, run: RunningLog, call: CallOptions = {}): Promise<void> {
	const duration = heartbeatSecondsOf(run, Date.now());
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
		},
		signal: call.signal
	});
}

/** Stops the run the popup shows; a 409 means another run replaced it meanwhile and goes on. */
export async function stopTimer(
	session: Session,
	run: Pick<RunningLog, 'id' | 'source'>,
	call: CallOptions = {}
): Promise<void> {
	await sessionRequest(session, '/timesheet/timer/stop', {
		method: 'POST',
		body: {
			tenantId: session.tenantId,
			organizationId: session.organizationId,
			logType: 'TRACKED',
			source: stopSourceOf(run),
			timeLogId: run.id
		},
		signal: call.signal
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
	const team = await sessionRequest<{ requirePlanToTrack?: boolean }>(
		session,
		`/organization-team/${session.teamId}`,
		{
			query: { organizationId: session.organizationId, tenantId: session.tenantId }
		}
	);
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
