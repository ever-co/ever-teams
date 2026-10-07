import { ITimerStatus, IUpdateTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { IGetTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { ITimeSlot } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

/** Day bounds computed in the browser, since neither this server nor Gauzy knows the user's time zone. */
export function readTodayRange(req: Request): Pick<IGetTimerStatusParams, 'todayStart' | 'todayEnd'> {
	const { searchParams } = new URL(req.url);

	return {
		todayStart: searchParams.get('todayStart') ?? undefined,
		todayEnd: searchParams.get('todayEnd') ?? undefined
	};
}

export function getTimerStatusRequest(
	{ tenantId, organizationId, todayStart, todayEnd }: IGetTimerStatusParams,
	bearer_token: string
) {
	const params = qs.stringify({ tenantId, organizationId, todayStart, todayEnd });

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
	{ source = ETimeLogSource.TEAMS, logType = 'TRACKED', taskId, tenantId, organizationId }: IUpdateTimerStatusParams,
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
