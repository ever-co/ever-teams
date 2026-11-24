import { IServerError, ITimerStatus, ITimeSlot, IUser, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { billableFieldsOf } from '../billable';
import { ApiCall } from '../fetch';
import qs from 'qs';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { IApiRequestConfig } from '../config/api-config';
import { apiUrlOf } from '../config/request-api-url';

// The kit records its time as EMBED. An API that predates that source answers 400 naming `source`: the kit then
// sends TEAMS, as before, to that API for the rest of the page's life. Kept per API address, so a host that moves
// to another API starts again with EMBED.
const apisRefusingEmbed = new Set<string>();

export const currentTimerSource = (api?: IApiRequestConfig): TimerSource => {
	if (apisRefusingEmbed.has(apiUrlOf(api))) {
		return TimerSource.TEAMS;
	}
	return TimerSource.EMBED;
};

const refusesSource = (response: unknown): boolean => {
	const error = response as { statusCode?: number; message?: unknown } | null;
	const isBadRequest = error?.statusCode === 400;
	// The validation message names the field ("source must be one of ..."); "resource" is not it
	const namesSource = /\bsource\b/.test(JSON.stringify(error?.message ?? ''));
	return isBadRequest && namesSource;
};

// Sends a timer write with the kit's source; on a refusal of that source, once more with TEAMS.
async function callWithTimerSource<T>(send: (source: TimerSource) => Promise<T>, api?: IApiRequestConfig): Promise<T> {
	// The API the request goes to (ApiCall reads the same address when it sends)
	const apiUrl = apiUrlOf(api);
	const source = currentTimerSource(api);
	const response = await send(source);
	const retryAsTeams = source === TimerSource.EMBED && refusesSource(response);
	if (!retryAsTeams) {
		return response;
	}
	apisRefusingEmbed.add(apiUrl);
	return send(TimerSource.TEAMS);
}

// For tests, and for a host whose API learned EMBED while the page stayed open.
export const resetTimerSource = () => {
	apisRefusingEmbed.clear();
};

export const getTimerStatus = async (
	user: IUser | null,
	token: string,
	organizationId?: string,
	api?: IApiRequestConfig
) => {
	try {
		if (!user) throw new Error('User not authenticated');

		const query = qs.stringify({
			tenantId: user.tenantId,
			organizationId
		});

		const response = await ApiCall<ITimerStatus>(
			{
				path: `/timesheet/timer/status?${query}`,
				method: 'GET',
				bearer_token: token
			},
			api
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

export const startTimer = async (
	user: IUser | null,
	token: string,
	currentTeamsState: ICurrentTeamsState,
	organizationId?: string,
	api?: IApiRequestConfig
) => {
	try {
		if (!user) throw new Error('User not authenticated');
		const { tenantId } = user;
		const { taskId, clientId: organizationContactId, organizationTeamId, projectId } = currentTeamsState;

		const response = await callWithTimerSource(
			(source) =>
				ApiCall<ITimeSlot>(
					{
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
							// Billable as the project is set, else billable as before (ever-co/ever-teams#5571)
							...billableFieldsOf(undefined, true),
							startedAt: new Date().toISOString(),
							organizationContactId,
							organizationTeamId,
							projectId,
							taskId,
							description: null
						}
					},
					api
				),
			api
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

export const stopTimer = async (
	user: IUser | null,
	token: string,
	organizationId?: string,
	api?: IApiRequestConfig
) => {
	try {
		if (!user) throw new Error('User not authenticated');
		const { tenantId } = user;

		const response = await callWithTimerSource(
			(source) =>
				ApiCall<ITimeSlot>(
					{
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
					},
					api
				),
			api
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

export const addTimeSlot = async (token: string, timeSlot: ITimeSlot, api?: IApiRequestConfig) => {
	try {
		const response = await ApiCall<ITimeSlot>(
			{
				path: '/timesheet/time-slot',
				method: 'POST',
				bearer_token: token,
				body: {
					...timeSlot
				}
			},
			api
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
