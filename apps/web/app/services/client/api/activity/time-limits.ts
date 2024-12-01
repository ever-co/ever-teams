import qs from 'qs';
import { get } from '../../axios';
import { IGetTimeLimitReport, ITimeLimitReport } from '@/app/interfaces/ITimeLimits';

export async function getTimeLimitsReportAPI(params: IGetTimeLimitReport) {
	const query = qs.stringify({
		...params
	});

	return await get<ITimeLimitReport[]>(`/timesheet/time-log/time-limit?${query}`);
}
