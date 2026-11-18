import { LogType, TimerSource } from '@ever-teams/toolkit-types';
import { EverTeamsValidationError } from './errors';
import { Identity } from './identity';
import { Transport } from './transport';

/**
 * A time log as the API answers it. The id of a project, task, client or team is null when the log has none, as for
 * a timer started without one.
 */
export interface EverTeamsTimeLog {
	id: string;
	tenantId: string;
	organizationId: string;
	employeeId: string;
	timesheetId: string | null;
	projectId: string | null;
	taskId: string | null;
	organizationContactId: string | null;
	organizationTeamId: string | null;
	startedAt: string;
	stoppedAt: string;
	editedAt: string | null;
	// Text, as the API answers it (a JSON text is never a TypeScript enum): it compares with LogType.TRACKED. BREAK,
	// time away from work, is a log type of the API (ever-co/ever-gauzy#11920) that LogType does not list.
	logType: `${LogType}` | 'BREAK';
	source: `${TimerSource}`;
	description: string | null;
	reason: string | null;
	isBillable: boolean;
	isRunning: boolean;
	isEdited: boolean;
	/** In seconds. */
	duration: number;
	version: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export interface EverTeamsTimerStatus {
	/** The seconds tracked today. */
	duration: number;
	running: boolean;
	/** The member's last time log, running or not; null before the first. */
	lastLog: EverTeamsTimeLog | null;
}

export interface TimerStartOptions {
	projectId?: string;
	taskId?: string;
	organizationTeamId?: string;
	description?: string;
}

export interface TimerResource {
	/** GET /timesheet/timer/status: whether the timer runs, its last log, and today's tracked seconds. */
	status(): Promise<EverTeamsTimerStatus>;
	/** POST /timesheet/timer/start: starts the timer, at the API's time, and answers the new time log. */
	start(options?: TimerStartOptions): Promise<EverTeamsTimeLog>;
	/** POST /timesheet/timer/stop: stops the running timer and answers its time log. */
	stop(): Promise<EverTeamsTimeLog | null>;
}

// An API that predates the EMBED source answers 400 with a message naming `source` ("resource" is not it).
function refusesSource(error: unknown): boolean {
	if (!(error instanceof EverTeamsValidationError)) {
		return false;
	}
	const isBadRequest = error.status === 400;
	const namesSource = /\bsource\b/.test(error.messages.join(' '));
	return isBadRequest && namesSource;
}

export function createTimer(transport: Transport, identity: Identity): TimerResource {
	// The timer writes as EMBED, like the kit's; once this client's API refused it, as TEAMS.
	let source = TimerSource.EMBED;

	async function withSource<T>(send: (source: TimerSource) => Promise<T>): Promise<T> {
		const sent = source;
		try {
			return await send(sent);
		} catch (error) {
			const retryAsTeams = sent === TimerSource.EMBED && refusesSource(error);
			if (!retryAsTeams) {
				throw error;
			}
			source = TimerSource.TEAMS;
			return send(TimerSource.TEAMS);
		}
	}

	async function status(): Promise<EverTeamsTimerStatus> {
		const { tenantId, organizationId } = await identity.scope();
		return transport.request<EverTeamsTimerStatus>({
			method: 'GET',
			path: '/timesheet/timer/status',
			query: { tenantId, organizationId },
			tenantId,
			organizationId
		});
	}

	async function start(options: TimerStartOptions = {}): Promise<EverTeamsTimeLog> {
		const { tenantId, organizationId } = await identity.scope();
		return withSource((source) =>
			transport.request<EverTeamsTimeLog>({
				method: 'POST',
				path: '/timesheet/timer/start',
				tenantId,
				organizationId,
				body: {
					tenantId,
					organizationId,
					logType: LogType.TRACKED,
					source,
					isBillable: true,
					projectId: options.projectId,
					taskId: options.taskId,
					organizationTeamId: options.organizationTeamId,
					description: options.description
				}
			})
		);
	}

	async function stop(): Promise<EverTeamsTimeLog | null> {
		const { tenantId, organizationId } = await identity.scope();
		return withSource((source) =>
			transport.request<EverTeamsTimeLog | null>({
				method: 'POST',
				path: '/timesheet/timer/stop',
				tenantId,
				organizationId,
				body: { tenantId, organizationId, logType: LogType.TRACKED, source }
			})
		);
	}

	return { status, start, stop };
}
