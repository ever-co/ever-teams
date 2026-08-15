import { IServerError, ITimerStatus, ITimeSlot, IUser, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import qs from 'qs';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';

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

		const response = await ApiCall<ITimeSlot>({
			path: '/timesheet/timer/start',
			method: 'POST',
			bearer_token: token,
			tenantId,
			organizationId,
			body: {
				tenantId,
				organizationId,
				logType: LogType.TRACKED,
				source: TimerSource.TEAMS,
				isBillable: true,
				startedAt: new Date().toISOString(),
				organizationContactId,
				organizationTeamId,
				projectId,
				taskId,
				description: null
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

export const stopTimer = async (user: IUser | null, token: string, organizationId?: string) => {
	try {
		if (!user) throw new Error('User not authenticated');
		const { tenantId } = user;

		const response = await ApiCall<ITimeSlot>({
			path: '/timesheet/timer/stop',
			method: 'POST',
			bearer_token: token,
			tenantId,
			organizationId,
			body: {
				tenantId,
				organizationId,
				logType: LogType.TRACKED,
				source: TimerSource.TEAMS
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
