import { IAddManualTimeRequest, ITimeLog } from '@/core/types/interfaces/timer/ITimerLogs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class ManualTimeService extends APIService {
	addManualTimeRequestAPI = async (request: IAddManualTimeRequest) => {
		const { startedAt, stoppedAt, ...rest } = request;
		const data = {
			...rest,
			startedAt: startedAt.toISOString(),
			stoppedAt: stoppedAt.toISOString()
		};

		return this.post<ITimeLog>(`/timesheet/time-log`, data);
	};
}

export const manualTimeService = new ManualTimeService(GAUZY_API_BASE_SERVER_URL.value);
