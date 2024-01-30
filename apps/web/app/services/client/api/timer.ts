import { ITimerStatus, IToggleTimerParams, TimerSource } from '@app/interfaces/ITimer';
import api, { get, post } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

export async function getTimerStatusAPI(tenantId: string, organizationId: string) {
	const params = new URLSearchParams({ tenantId, organizationId });
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params.toString()}` : '/timer/status';

	return get<ITimerStatus>(endpoint);
}

export async function toggleTimerAPI(body: Pick<IToggleTimerParams, 'taskId'>) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		await post('/timesheet/timer/toggle', {
			source: TimerSource.TEAMS,
			logType: 'TRACKED',
			taskId: body.taskId,
			tenantId,
			organizationId
		});

		await post('/timesheet/timer/stop', {
			source: TimerSource.TEAMS,
			logType: 'TRACKED',
			taskId: body.taskId,
			tenantId,
			organizationId
		});

		return getTimerStatusAPI(tenantId, organizationId);
	}

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
