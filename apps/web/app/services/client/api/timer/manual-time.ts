import { post } from '@app/services/client/axios';
import { IAddManualTimeRequest, ITimeLog } from '@app/interfaces/timer/ITimerLogs';

export async function addManualTimeRequestAPI(request: IAddManualTimeRequest) {
	const { startedAt, stoppedAt, ...rest } = request;
	const data = {
		...rest,
		startedAt: startedAt.toISOString(),
		stoppedAt: stoppedAt.toISOString()
	};

	return post<ITimeLog>(`/timesheet/time-log`, data);
}
