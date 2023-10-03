import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';

type TTasksTimesheetStatisticsParams = {
	tenantId: string;
	organizationId: string;
	startDate?: string;
	endDate?: string;
	employeeIds: string[];
	defaultRange?: string;
	'taskIds[0]'?: string;
	unitOfTime?: 'day';
};
export function tasksTimesheetStatisticsRequest(
	params: TTasksTimesheetStatisticsParams,
	bearer_token: string
) {
	const { employeeIds, ...rest } = params;

	const queries = new URLSearchParams({
		...rest,
		...employeeIds.reduce(
			(acc, v, i) => {
				acc[`employeeIds[${i}]`] = v;
				return acc;
			},
			{} as Record<string, any>
		)
	});

	return serverFetch<ITasksTimesheet[]>({
		path: `/timesheet/statistics/tasks?${queries.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}
