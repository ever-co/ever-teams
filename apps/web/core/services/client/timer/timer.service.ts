import qs from 'qs';
import { APIService } from '../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITimerStatus, IToggleTimerParams, IUser, TimerSource } from '@/core/types/interfaces';
import {
	getActiveTaskIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import api from '../axios';

class TimerService extends APIService {
	getTimerStatusAPI = async (tenantId: string, organizationId: string) => {
		const params = qs.stringify({ tenantId, organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params}` : '/timer/status';

		return this.get<ITimerStatus>(endpoint);
	};

	toggleTimerAPI = async (body: Pick<IToggleTimerParams, 'taskId'>) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/toggle', {
				source: TimerSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId,
				organizationId
			});

			await this.post('/timesheet/timer/stop', {
				source: TimerSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId,
				organizationId
			});

			return this.getTimerStatusAPI(tenantId, organizationId);
		}

		return api.post<ITimerStatus>('/timer/toggle', body);
	};

	startTimerAPI = async () => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		const teamId = getActiveTeamIdCookie();
		const taskId = getActiveTaskIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/start', {
				tenantId,
				organizationId,
				taskId,
				logType: 'TRACKED',
				source: TimerSource.TEAMS,
				tags: [],
				organizationTeamId: teamId
			});

			return this.getTimerStatusAPI(tenantId, organizationId);
		}

		return api.post<ITimerStatus>('/timer/start');
	};

	stopTimerAPI = async (source: TimerSource) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		const taskId = getActiveTaskIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/stop', {
				source,
				logType: 'TRACKED',
				...(taskId ? { taskId } : {}),
				tenantId,
				organizationId
			});

			return this.getTimerStatusAPI(tenantId, organizationId);
		}

		return api.post<ITimerStatus>('/timer/stop', {
			source
		});
	};

	syncTimerAPI = async (source: TimerSource, user: IUser | undefined) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId,
				organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee.id,
				duration: 5
			});

			return this.getTimerStatusAPI(tenantId, organizationId);
		}

		return api.post<ITimerStatus>('/timer/sync', {
			source
		});
	};
}

export const timerService = new TimerService(GAUZY_API_BASE_SERVER_URL.value);
