import { post } from '@app/services/client/axios';
import { IAddManualTimeRequest, ITimeLog } from '@app/interfaces/timer/ITimerLogs';
import qs from 'qs';

export async function addManualTimeRequestAPI(request: IAddManualTimeRequest) {
	const { startedAt, stoppedAt, ...rest } = request;
	const params = {
		...rest,
		startedAt: startedAt.toISOString(),
		stoppedAt: stoppedAt.toISOString()
	};

	const query = qs.stringify(params);

	return post<ITimeLog>(`/timesheet/time-log?${query}`);
}
