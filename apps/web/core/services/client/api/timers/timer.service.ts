import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/interfaces/enums/timer';
import { IUser } from '@/core/types/interfaces/user/user';
import {
	getActiveTaskIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { ITimerStatus, IToggleTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';

class TimerService extends APIService {
	getTimerStatus = async (tenantId: string, organizationId: string) => {
		const params = qs.stringify({ tenantId, organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params}` : '/timer/status';

		return this.get<ITimerStatus>(endpoint);
	};

	toggleTimer = async (body: Pick<IToggleTimerStatusParams, 'taskId'>) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/toggle', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId,
				organizationId
			});

			await this.post('/timesheet/timer/stop', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId,
				organizationId
			});

			return this.getTimerStatus(tenantId, organizationId);
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/toggle', body);
	};

	startTimer = async () => {
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
				source: ETimeLogSource.TEAMS,
				tags: [],
				organizationTeamId: teamId
			});

			return this.getTimerStatus(tenantId, organizationId);
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/start');
	};

	stopTimer = async (source: ETimeLogSource) => {
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

			return this.getTimerStatus(tenantId, organizationId);
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/stop', {
			source
		});
	};

	syncTimer = async (source: ETimeLogSource, user: IUser | undefined) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId,
				organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee?.id,
				duration: 5
			});

			return this.getTimerStatus(tenantId, organizationId);
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/sync', {
			source
		});
	};

	getTaskStatusList = async (
		tenantId: string,
		organizationId: string,
		employeeId: string,
		organizationTeamId: string | null
	) => {
		const params: {
			tenantId: string;
			organizationId: string;
			employeeId: string;
			organizationTeamId?: string;
		} = {
			tenantId,
			organizationId,
			employeeId
		};
		if (organizationTeamId) params.organizationTeamId = organizationTeamId;
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status?${query}`
			: `/timer/status?tenantId=${tenantId}&organizationId=${organizationId}${organizationTeamId ? `&organizationTeamId=${organizationTeamId}` : ''}&employeeId=${employeeId}`;

		return this.get<ITimerStatus>(endpoint, { tenantId });
	};
}

export const timerService = new TimerService(GAUZY_API_BASE_SERVER_URL.value);
