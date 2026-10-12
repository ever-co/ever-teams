import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import moment from 'moment';
import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';

import { getActiveTaskIdCookie } from '@/core/lib/helpers/cookies';
import { toTimeSlotDuration } from '@/core/lib/helpers/timer';
import { ITimerStatus, IToggleTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { TUser } from '@/core/types/schemas';
import { scopedReadConfig, type ScopedReadOptions } from '../../api-request-scope';

// Without these bounds Gauzy counts "today" from the API server's midnight, not the user's.
// One clock read for both bounds, so a call at midnight cannot span two days.
const getTodayRangeQuery = () => {
	const now = moment();

	return qs.stringify({
		todayStart: now.clone().startOf('day').toISOString(),
		todayEnd: now.clone().endOf('day').toISOString()
	});
};

class TimerService extends APIService {
	// Last time-slot sync, tied to the time log (timer run) it was measured for.
	private lastTimeSlotSync: { at: number; timeLogId?: string } | null = null;

	getTimerStatus = async (options?: ScopedReadOptions) => {
		const tenantId = options?.scope.tenantId ?? this.tenantId;
		const organizationId = options?.scope.organizationId ?? this.organizationId;
		const params = qs.stringify({ tenantId, organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status?${params}&${getTodayRangeQuery()}`
			: `/timer/status?${getTodayRangeQuery()}`;

		return this.get<ITimerStatus>(endpoint, options ? scopedReadConfig(options) : undefined);
	};

	toggleTimer = async (body: Pick<IToggleTimerStatusParams, 'taskId'>) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/toggle', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				organizationTeamId: this.activeTeamId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/toggle?${getTodayRangeQuery()}`, body);
	};

	startTimer = async ({ taskId }: { taskId: string }) => {
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
		return this.resetTimeSlotSync(
			startedAt,
			await api.post<ITimerStatus>(`/timer/start?${getTodayRangeQuery()}`, { taskId })
		);
	};

	private readonly resetTimeSlotSync = <R extends { data?: ITimerStatus }>(at: number, response: R): R => {
		this.lastTimeSlotSync = { at, timeLogId: response.data?.lastLog?.id };
		return response;
	};

	stopTimer = async ({
		source,
		startedAt,
		stoppedAt
	}: {
		source: ETimeLogSource;
		startedAt?: Date | string;
		stoppedAt?: Date | string;
	}) => {
		const taskId = getActiveTaskIdCookie();
		const range = { ...(startedAt ? { startedAt } : {}), ...(stoppedAt ? { stoppedAt } : {}) };

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/stop', {
				source,
				logType: 'TRACKED',
				...(taskId ? { taskId } : {}),
				...range,
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/stop?${getTodayRangeQuery()}`, {
			source,
			...range
		});
	};

	// /timesheet/timer/status only sees logs started today; this returns the employee's last log of any day.
	getLastTimerLog = async (employeeId: string) => {
		const params = qs.stringify({ tenantId: this.tenantId, organizationId: this.organizationId, employeeId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status/worked?${params}`
			: '/timer/status/worked';

		return this.get<ITimerStatus[]>(endpoint);
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
		const reference = { at: now, timeLogId: timeLogId ?? previous?.timeLogId };
		this.lastTimeSlotSync = reference;
		// A failed write credited nothing: unless a newer sync took over, the previous reference comes back so the retry covers this interval.
		const restoreReference = (error: unknown): never => {
			if (this.lastTimeSlotSync === reference) {
				this.lastTimeSlotSync = previous;
			}
			throw error;
		};
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee?.id,
				duration
			}).catch(restoreReference);

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api
			.post<ITimerStatus>(`/timer/sync?${getTodayRangeQuery()}`, {
				source,
				duration
			})
			.catch(restoreReference);
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
