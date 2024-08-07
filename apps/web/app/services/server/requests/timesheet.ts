import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';
import qs from 'qs';

export type TTasksTimesheetStatisticsParams = {
	tenantId: string;
	organizationId: string;
	startDate?: string;
	endDate?: string;
	employeeIds: string[];
	defaultRange?: string;
	'taskIds[0]'?: string;
	unitOfTime?: 'day';
};
export function tasksTimesheetStatisticsRequest(params: TTasksTimesheetStatisticsParams, bearer_token: string) {
	const { employeeIds, ...rest } = params;

	const queries = qs.stringify({
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
		path: `/timesheet/statistics/tasks?${queries}`,
		method: 'POST',
		bearer_token,
		tenantId: params.tenantId
	});
}

export type TTaskActivityParams = {
	tenantId: string;
	organizationId: string;
	defaultRange?: string;
	'taskIds[0]'?: string;
	unitOfTime?: 'day';
};

export function taskActivityRequest(params: TTaskActivityParams, bearer_token: string) {
	const queries = qs.stringify(params);

	return serverFetch<ITasksTimesheet[]>({
		path: `/timesheet/activity?${queries.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}
