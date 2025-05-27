import { ITimerStatus, IUpdateTimerStatusParams } from '@/core/types/interfaces/timer/ITimerStatus';
import { IGetTimerStatusParams } from '@/core/types/interfaces/timer/ITimerStatus';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { ITimeSlot } from '@/core/types/interfaces/time-slot/ITimeSlot';
import { ITimeLog } from '@/core/types/interfaces/time-log/ITimeLog';
import { TimerSource } from '@/core/types/enums/timer';

export function getTimerStatusRequest({ tenantId, organizationId }: IGetTimerStatusParams, bearer_token: string) {
	const params = qs.stringify({ tenantId, organizationId });

	return serverFetch<ITimerStatus>({
		path: `/timesheet/timer/status?${params}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function startTimerRequest(params: IUpdateTimerStatusParams, bearer_token: string) {
	return serverFetch<ITimeLog>({
		path: '/timesheet/timer/start',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function stopTimerRequest(params: IUpdateTimerStatusParams, bearer_token: string) {
	return serverFetch<ITimeLog | null>({
		path: '/timesheet/timer/stop',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function toggleTimerRequest(
	{ source = TimerSource.TEAMS, logType = 'TRACKED', taskId, tenantId, organizationId }: IUpdateTimerStatusParams,
	bearer_token: string
) {
	return serverFetch<ITimeLog | null>({
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

export function syncTimeSlotRequest(params: any, bearer_token: string) {
	return serverFetch<ITimeSlot>({
		path: '/timesheet/time-slot',
		method: 'POST',
		body: params,
		bearer_token,
		tenantId: params.tenantId
	});
}
