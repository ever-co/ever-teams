import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';

import { getActiveTaskIdCookie } from '@/core/lib/helpers/cookies';
import { ITimerStatus, IToggleTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { TUser } from '@/core/types/schemas';

class TimerService extends APIService {
	getTimerStatus = async () => {
		const params = qs.stringify({ tenantId: this.tenantId, organizationId: this.organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params}` : '/timer/status';

		return this.get<ITimerStatus>(endpoint);
	};

	toggleTimer = async (body: Pick<IToggleTimerStatusParams, 'taskId'>) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/toggle', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			await this.post('/timesheet/timer/stop', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/toggle', body);
	};

	startTimer = async () => {
		const taskId = getActiveTaskIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/start', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				taskId,
				logType: 'TRACKED',
				source: ETimeLogSource.TEAMS,
				tags: [],
				organizationTeamId: this.activeTeamId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/start');
	};

	stopTimer = async ({ source }: { source: ETimeLogSource }) => {
		const taskId = getActiveTaskIdCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/stop', {
				source,
				logType: 'TRACKED',
				...(taskId ? { taskId } : {}),
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/stop', {
			source
		});
	};

	syncTimer = async ({ source, user }: { source: ETimeLogSource; user?: TUser | null }) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee?.id,
				duration: 5
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/sync', {
			source
		});
	};

	getTaskStatusList = async ({ employeeId }: { employeeId: string }) => {
		const params: {
			tenantId: string;
			organizationId: string;
			employeeId: string;
			organizationTeamId?: string;
		} = {
			tenantId: this.tenantId,
			organizationId: this.organizationId,
			employeeId
		};
		if (this.activeTeamId) params.organizationTeamId = this.activeTeamId;
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status?${query}`
			: `/timer/status?tenantId=${this.tenantId}&organizationId=${this.organizationId}${this.activeTeamId ? `&organizationTeamId=${this.activeTeamId}` : ''}&employeeId=${employeeId}`;

		return this.get<ITimerStatus>(endpoint, { tenantId: this.tenantId });
	};
}

export const timerService = new TimerService(GAUZY_API_BASE_SERVER_URL.value);
