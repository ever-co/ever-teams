import { IServerError, ITimerStatus, ITimeSlot, IUser, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import qs from 'qs';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';

// The kit records its time as EMBED. An API that predates that source answers 400 naming `source`: the kit then
// sends TEAMS, as before, for the rest of the page's life.
let embedSourceRefused = false;

export const currentTimerSource = (): TimerSource => {
	if (embedSourceRefused) {
		return TimerSource.TEAMS;
	}
	return TimerSource.EMBED;
};

const refusesSource = (response: unknown): boolean => {
	const error = response as { statusCode?: number; message?: unknown } | null;
	const isBadRequest = error?.statusCode === 400;
	const namesSource = JSON.stringify(error?.message ?? '').includes('source');
	return isBadRequest && namesSource;
};

// Sends a timer write with the kit's source; on a refusal of that source, once more with TEAMS.
async function callWithTimerSource<T>(send: (source: TimerSource) => Promise<T>): Promise<T> {
	const source = currentTimerSource();
	const response = await send(source);
	const retryAsTeams = source === TimerSource.EMBED && refusesSource(response);
	if (!retryAsTeams) {
		return response;
	}
	embedSourceRefused = true;
	return send(TimerSource.TEAMS);
}

// For tests and for a host that switches API at runtime.
export const resetTimerSource = () => {
	embedSourceRefused = false;
};

export const getTimerStatus = async (user: IUser | null, token: string, organizationId?: string) => {
	try {
		if (!user) throw new Error('User not authenticated');

		const query = qs.stringify({
			tenantId: user.tenantId,
			organizationId
		});

		const response = await ApiCall<ITimerStatus>({
			path: `/timesheet/timer/status?${query}`,
			method: 'GET',
			bearer_token: token
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

export const startTimer = async (
	user: IUser | null,
	token: string,
	currentTeamsState: ICurrentTeamsState,
	organizationId?: string
) => {
	try {
		if (!user) throw new Error('User not authenticated');
		const { tenantId } = user;
		const { taskId, clientId: organizationContactId, organizationTeamId, projectId } = currentTeamsState;

		const response = await callWithTimerSource((source) =>
			ApiCall<ITimeSlot>({
				path: '/timesheet/timer/start',
				method: 'POST',
				bearer_token: token,
				tenantId,
				organizationId,
				body: {
					tenantId,
					organizationId,
					logType: LogType.TRACKED,
					source,
					isBillable: true,
					startedAt: new Date().toISOString(),
					organizationContactId,
					organizationTeamId,
					projectId,
					taskId,
					description: null
				}
			})
		);

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

export const stopTimer = async (user: IUser | null, token: string, organizationId?: string) => {
	try {
		if (!user) throw new Error('User not authenticated');
		const { tenantId } = user;

		const response = await callWithTimerSource((source) =>
			ApiCall<ITimeSlot>({
				path: '/timesheet/timer/stop',
				method: 'POST',
				bearer_token: token,
				tenantId,
				organizationId,
				body: {
					tenantId,
					organizationId,
					logType: LogType.TRACKED,
					source
				}
			})
		);

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

export const addTimeSlot = async (token: string, timeSlot: ITimeSlot) => {
	try {
		const response = await ApiCall<ITimeSlot>({
			path: '/timesheet/time-slot',
			method: 'POST',
			bearer_token: token,
			body: {
				...timeSlot
			}
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};
