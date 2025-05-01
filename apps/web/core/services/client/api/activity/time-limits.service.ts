import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import qs from 'qs';
import { IGetTimeLimitReport, ITimeLimitReport } from '@/core/types/interfaces/ITimeLimits';

class TimeLimitsService extends APIService {
	async getTimeLimitsReport(params: IGetTimeLimitReport) {
		const query = qs.stringify({
			...params
		});

		return await this.get<ITimeLimitReport[]>(`/timesheet/time-log/time-limit?${query}`);
	}
}

export const timeLimitsService = new TimeLimitsService(GAUZY_API_BASE_SERVER_URL.value);
