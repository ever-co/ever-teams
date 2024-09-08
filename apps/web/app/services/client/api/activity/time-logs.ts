import { get } from '@app/services/client/axios';
import { ITimerLogsDailyReportRequest, ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import qs from 'qs';

export async function getTimerLogsDailyReportRequestAPI({
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

	return get<ITimerLogsDailyReport[]>(`/timesheet/time-log/report/daily?${query}`);
}
