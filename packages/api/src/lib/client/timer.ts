import { ITimerStatus, ITimeSlot, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { EverTeamsValidationError } from './errors';
import { Identity } from './identity';
import { Transport } from './transport';

export interface TimerStartOptions {
	projectId?: string;
	taskId?: string;
	organizationTeamId?: string;
	description?: string;
}

export interface TimerResource {
	/** GET /timesheet/timer/status: whether the timer runs, its last log, and today's tracked seconds. */
	status(): Promise<ITimerStatus>;
	/** POST /timesheet/timer/start: starts the timer, at the API's time, and answers the new time log. */
	start(options?: TimerStartOptions): Promise<ITimeSlot>;
	/** POST /timesheet/timer/stop: stops the running timer and answers its time log. */
	stop(): Promise<ITimeSlot | null>;
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

	async function status(): Promise<ITimerStatus> {
		const { tenantId, organizationId } = await identity.scope();
		return transport.request<ITimerStatus>({
			method: 'GET',
			path: '/timesheet/timer/status',
			query: { tenantId, organizationId },
			tenantId,
			organizationId
		});
	}

	async function start(options: TimerStartOptions = {}): Promise<ITimeSlot> {
		const { tenantId, organizationId } = await identity.scope();
		return withSource((source) =>
			transport.request<ITimeSlot>({
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

	async function stop(): Promise<ITimeSlot | null> {
		const { tenantId, organizationId } = await identity.scope();
		return withSource((source) =>
			transport.request<ITimeSlot | null>({
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
