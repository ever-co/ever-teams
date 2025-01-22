import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { ITimerDailyLog, TimesheetLog, UpdateTimesheet, UpdateTimesheetStatus } from '@/app/interfaces/timer/ITimerLog';
import { IUpdateTimesheetStatus } from '@/app/interfaces';

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

/**
 * Parameters for timesheet API requests
 * @property organizationId - Organization identifier
 * @property tenantId - Tenant identifier
 * @property startDate - Start date for timesheet period
 * @property endDate - End date for timesheet period
 * @property timeZone - Optional timezone for date calculations (defaults to UTC)
 */
type ITimesheetProps = {
	organizationId: string;
	tenantId: string;
	startDate: string;
	endDate: string;
	timeZone?: string;
};

export function getTaskTimesheetRequest(params: ITimesheetProps, bearer_token: string) {
	const queries = qs.stringify(params);
	return serverFetch<TimesheetLog[]>({
		path: `/timesheet/time-log?activityLevel?${queries.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}

type IDeleteTimesheetProps = {
	organizationId: string;
	tenantId: string;
	logIds?: string[];
};

export function deleteTaskTimesheetRequest(params: IDeleteTimesheetProps, bearer_token: string) {
	const { logIds = [] } = params;
	return serverFetch<TimesheetLog[]>({
		path: `/timesheet/time-log/${logIds.join(',')}`,
		method: 'DELETE',
		bearer_token,
		tenantId: params.tenantId
	});
}

export function updateStatusTimesheetRequest(params: IUpdateTimesheetStatus, bearer_token: string) {
	return serverFetch<UpdateTimesheetStatus[]>({
		path: '/timesheet/status',
		method: 'PUT',
		body: { ...params },
		bearer_token,
		tenantId: params.tenantId
	});
}

export function createTimesheetRequest(params: UpdateTimesheet, bearer_token: string) {
	return serverFetch<TimesheetLog>({
		path: '/timesheet/time-log',
		method: 'POST',
		body: { ...params },
		bearer_token,
		tenantId: params.tenantId
	});
}

export function updateTimesheetRequest(params: UpdateTimesheet, bearer_token: string) {
	return serverFetch<TimesheetLog>({
		path: `/timesheet/time-log/${params.id}`,
		method: 'PUT',
		body: { ...params },
		bearer_token,
		tenantId: params.tenantId
	});
}

export interface ITimeLogReportDailyChartProps {
	activityLevel: {
		start: number;
		end: number;
	};
	organizationId: string;
	tenantId: string;
	startDate: string;
	endDate: string;
	timeZone?: string;
	groupBy?: string;
}

export function getTimeLogReportDailyChartRequest(params: ITimeLogReportDailyChartProps, bearer_token: string) {
	const queries = qs.stringify(params);
	return serverFetch<ITimerDailyLog[]>({
		path: `/timesheet/time-log/report/daily-chart?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}
