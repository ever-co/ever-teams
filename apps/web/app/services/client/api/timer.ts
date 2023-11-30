import { ITimerStatus, IToggleTimerParams, TimerSource } from '@app/interfaces/ITimer';
import api, { get } from '../axios';

export async function getTimerStatusAPI(tenantId: string, organizationId: string) {
	const params = new URLSearchParams({ tenantId, organizationId });
	const endpoint = process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
		? `/timesheet/timer/status?${params.toString()}`
		: '/timer/status';
	const data = await get(endpoint, true);

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}

export function toggleTimerAPI(body: Pick<IToggleTimerParams, 'taskId'>) {
	return api.post<ITimerStatus>('/timer/toggle', body);
}

export function startTimerAPI() {
	return api.post<ITimerStatus>('/timer/start');
}

export function stopTimerAPI(source: TimerSource) {
	return api.post<ITimerStatus>('/timer/stop', {
		source
	});
}

export function syncTimerAPI(source: TimerSource) {
	return api.post<ITimerStatus>('/timer/sync', {
		source
	});
}
