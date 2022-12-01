import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';

type TTasksTimesheetStatisticsParams = {
	tenantId: string;
	organizationId: string;
	startDate?: string;
	endDate?: string;
	'employeeIds[0]': string;
};
export function tasksTimesheetStatisticsRequest(
	params: TTasksTimesheetStatisticsParams,
	bearer_token: string
) {
	const queries = new URLSearchParams(params);

	return serverFetch<ITasksTimesheet[]>({
		path: `/timesheet/statistics/tasks?${queries.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId,
	});
}
