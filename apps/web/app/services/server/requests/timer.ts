import {
	ITimer,
	ITimerStatusParams,
	ITimerStatus,
	ITimerParams,
	ITimerTimeslotParams,
	TimerSource
} from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';

export function getTimerStatusRequest({ tenantId, organizationId }: ITimerStatusParams, bearer_token: string) {
	const params = new URLSearchParams({ tenantId, organizationId });
	return serverFetch<ITimerStatus>({
		path: `/timesheet/timer/status?${params.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function startTimerRequest(params: ITimerParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/start',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function stopTimerRequest(params: ITimerParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/stop',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function toggleTimerRequest(
	{ source = TimerSource.TEAMS, logType = 'TRACKED', taskId, tenantId, organizationId }: ITimerParams,
	bearer_token: string
) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/toggle',
		method: 'POST',
		body: {
			source,
			logType,
			taskId,
			tenantId,
			organizationId
		},
		bearer_token,
		tenantId
	});
}

export function syncTimeSlotRequest(params: ITimerTimeslotParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/time-slot',
		method: 'POST',
		body: params,
		bearer_token,
		tenantId: params.tenantId
	});
}
