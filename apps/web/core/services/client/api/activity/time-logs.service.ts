import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { ITimerLogsDailyReport, ITimerLogsDailyReportRequest } from '@/core/types/interfaces/timer/ITimerLogs';
import qs from 'qs';

class TimeLogsService extends APIService {
	async getTimerLogsDailyReport({
		tenantId,
		organizationId,
		employeeIds,
		startDate,
		endDate
	}: ITimerLogsDailyReportRequest) {
		const params = {
			tenantId: tenantId,
			organizationId: organizationId,
			employeeIds,
			todayEnd: startDate.toISOString(),
			todayStart: endDate.toISOString()
		};

		const query = qs.stringify(params);

		return this.get<ITimerLogsDailyReport[]>(`/timesheet/time-log/report/daily?${query}`);
	}
}

export const timeLogsService = new TimeLogsService(GAUZY_API_BASE_SERVER_URL.value);
