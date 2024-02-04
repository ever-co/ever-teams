import { ITimerStatus, IToggleTimerParams, TimerSource } from '@app/interfaces/ITimer';
import api, { get, post } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getActiveTaskIdCookie, getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import { IUser } from '@app/interfaces';
import qs from 'qs';

export async function getTimerStatusAPI(tenantId: string, organizationId: string) {
	const params = qs.stringify({ tenantId, organizationId });
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params}` : '/timer/status';

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

export async function startTimerAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const teamId = getActiveTeamIdCookie();
	const taskId = getActiveTaskIdCookie();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		await post('/timesheet/timer/start', {
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source: TimerSource.TEAMS,
			tags: [],
			organizationTeamId: teamId
		});

		return getTimerStatusAPI(tenantId, organizationId);
	}

	return api.post<ITimerStatus>('/timer/start');
}

export async function stopTimerAPI(source: TimerSource) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const taskId = getActiveTaskIdCookie();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		await post('/timesheet/timer/stop', {
			source,
			logType: 'TRACKED',
			...(taskId ? { taskId } : {}),
			tenantId,
			organizationId
		});

		return getTimerStatusAPI(tenantId, organizationId);
	}

	return api.post<ITimerStatus>('/timer/stop', {
		source
	});
}

export async function syncTimerAPI(source: TimerSource, user: IUser | undefined) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		await post('/timesheet/time-slot', {
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source,
			employeeId: user?.employee.id,
			duration: 5
		});

		return getTimerStatusAPI(tenantId, organizationId);
	}

	return api.post<ITimerStatus>('/timer/sync', {
		source
	});
}
