import { ITasksTimesheet } from '../../interfaces/ITimer';
import { serverFetch } from '../fetch';

type TTasksTimesheetStatisticsParams = {
	tenantId: string;
	organizationId: string;
	startDate?: string;
	endDate?: string;
	'employeeIds[0]': string;
	defaultRange?: string;
	'taskIds[0]'?: string;
	unitOfTime?: 'day';
};

export function tasksTimesheetStatisticsRequest(params: TTasksTimesheetStatisticsParams, bearer_token: string) {
	const queries = new URLSearchParams(params);

	return serverFetch<ITasksTimesheet[]>({
		path: `/timesheet/statistics/tasks?${queries.toString()}`,
		method: 'POST',
		// Gauzy reads this POST route's filters from the body only, never from the query string.
		body: {
			tenantId: params.tenantId,
			organizationId: params.organizationId,
			employeeIds: [params['employeeIds[0]']],
			taskIds: params['taskIds[0]'] ? [params['taskIds[0]']] : undefined,
			defaultRange: params.defaultRange,
			unitOfTime: params.unitOfTime,
			startDate: params.startDate,
			endDate: params.endDate
		},
		bearer_token,
		tenantId: params.tenantId
	});
}
