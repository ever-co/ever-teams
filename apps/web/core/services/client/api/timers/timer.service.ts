import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';

import { getActiveTaskIdCookie } from '@/core/lib/helpers/cookies';
import { toTimeSlotDuration } from '@/core/lib/helpers/timer';
import { ITimerStatus, IToggleTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { TUser } from '@/core/types/schemas';
import { scopedReadConfig, type ScopedReadOptions } from '../../api-request-scope';

class TimerService extends APIService {
	// Last time-slot sync, tied to the time log (timer run) it was measured for.
	private lastTimeSlotSync: { at: number; timeLogId?: string } | null = null;

	getTimerStatus = async (options?: ScopedReadOptions) => {
		const tenantId = options?.scope.tenantId ?? this.tenantId;
		const organizationId = options?.scope.organizationId ?? this.organizationId;
		const params = qs.stringify({ tenantId, organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/timer/status?${params}` : '/timer/status';

		return this.get<ITimerStatus>(endpoint, options ? scopedReadConfig(options) : undefined);
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
		const startedAt = Date.now();

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

			return this.resetTimeSlotSync(startedAt, await this.getTimerStatus());
		}

		const api = await getFallbackAPI();
		return this.resetTimeSlotSync(startedAt, await api.post<ITimerStatus>('/timer/start'));
	};

	private resetTimeSlotSync = <R extends { data?: ITimerStatus }>(at: number, response: R): R => {
		this.lastTimeSlotSync = { at, timeLogId: response.data?.lastLog?.id };
		return response;
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

	syncTimer = async ({
		source,
		user,
		timeLogId
	}: {
		source: ETimeLogSource;
		user?: TUser | null;
		timeLogId?: string;
	}) => {
		// Advanced before the request so overlapping syncs never credit the same seconds twice.
		const now = Date.now();
		const previous = this.lastTimeSlotSync;
		// A reference from another run (stopped and restarted from another tab or device) would credit the gap.
		const sameRun = previous !== null && (!previous.timeLogId || !timeLogId || previous.timeLogId === timeLogId);
		const duration = toTimeSlotDuration(sameRun ? (now - previous.at) / 1000 : undefined);
		this.lastTimeSlotSync = { at: now, timeLogId: timeLogId ?? previous?.timeLogId };

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee?.id,
				duration
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>('/timer/sync', {
			source,
			duration
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
