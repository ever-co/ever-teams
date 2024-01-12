import { ITimerStatus, IToggleTimerParams, TimerSource } from '@app/interfaces/ITimer';
import api, { get } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';

export async function getTimerStatusAPI(tenantId: string, organizationId: string) {
	const params = new URLSearchParams({ tenantId, organizationId });
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params.toString()}` : '/timer/status';

	return get<ITimerStatus>(endpoint);
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
