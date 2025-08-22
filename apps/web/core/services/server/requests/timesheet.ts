import { serverFetch } from '../fetch';
import qs from 'qs';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	ITimesheet,
	ITimesheetCountsStatistics,
	IUpdateTimesheetStatus
} from '@/core/types/interfaces/timesheet/timesheet';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { IActivityReport, ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { ITimeLogReportDailyChart } from '@/core/types/interfaces/activity/activity-report';

export type TTasksTimesheetStatisticsParams = {
	tenantId: string;
	organizationId: string;
	startDate?: string;
	endDate?: string;
	employeeIds?: string[];
	defaultRange?: string;
	taskIds?: string[];
	unitOfTime?: 'day';
};
export function tasksTimesheetStatisticsRequest(params: TTasksTimesheetStatisticsParams, bearer_token: string) {
	const queries = qs.stringify(params, { arrayFormat: 'indices' });

	return serverFetch<TTaskStatistics[]>({
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
	taskIds?: string[];
	unitOfTime?: 'day';
};

export function taskActivityRequest(params: TTaskActivityParams, bearer_token: string) {
	const queries = qs.stringify(params);

	return serverFetch<TTaskStatistics[]>({
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
	return serverFetch<ITimeLog[]>({
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
	return serverFetch<ITimeLog[]>({
		path: `/timesheet/time-log/${logIds.join(',')}`,
		method: 'DELETE',
		bearer_token,
		tenantId: params.tenantId
	});
}

export function updateStatusTimesheetRequest(params: IUpdateTimesheetStatus, bearer_token: string) {
	return serverFetch<ITimesheet[]>({
		path: '/timesheet/status',
		method: 'PUT',
		body: { ...params },
		bearer_token,
		tenantId: params.tenantId
	});
}

export function createTimesheetRequest(params: Partial<ITimesheet>, bearer_token: string) {
	return serverFetch<ITimeLog>({
		path: '/timesheet/time-log',
		method: 'POST',
		body: { ...params },
		bearer_token,
		tenantId: params.tenantId
	});
}

export function updateTimesheetRequest(params: Partial<ITimesheet>, bearer_token: string) {
	return serverFetch<ITimeLog>({
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
	teamId?: string;
	userId?: string;
}

export interface ITimeLogRequestParams {
	organizationId: string;
	tenantId: string;
	startDate: string | Date;
	endDate: string | Date;
	timeZone?: string;
	groupBy?: string;
	projectIds?: string[];
	employeeIds?: string[];
	taskIds?: string[];
	teamIds?: string[];
	activityLevel?: {
		start: number;
		end: number;
	};
}

// export type LogType = 'TRACKED' | 'MANUAL' | 'IDLE';

export interface ITimesheetStatisticsCountsProps {
	activityLevel: {
		start: number;
		end: number;
	};
	logType: ETimeLogType[];
	organizationId: string;
	tenantId: string;
	startDate: string;
	endDate: string;
	timeZone?: string;
}

/**
 * Parameters specific to activity report requests
 */
export interface IActivityRequestParams extends ITimeLogRequestParams {
	/** Activity sources to include */
	source?: string[];
	/** Types of logs to include */
	logType?: ETimeLogType[];
}

/**
 * Fetches timesheet statistics counts from the API
 * @param params - Parameters for the statistics request
 * @param bearer_token - Authentication token
 * @returns Promise with the statistics counts data
 */
export async function getTimesheetStatisticsCountsRequest(
	{ tenantId, ...params }: ITimesheetStatisticsCountsProps,
	bearer_token: string
): Promise<{ data: ITimesheetCountsStatistics }> {
	const queries = qs.stringify(params, {
		arrayFormat: 'indices',
		encode: true,
		strictNullHandling: true
	});

	return serverFetch<ITimesheetCountsStatistics>({
		path: `/timesheet/statistics/counts?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

function buildTimeLogParams(params: ITimeLogRequestParams): URLSearchParams {
	const baseParams = new URLSearchParams({
		organizationId: params.organizationId,
		tenantId: params.tenantId,
		startDate: params.startDate instanceof Date ? params.startDate.toISOString() : params.startDate,
		endDate: params.endDate instanceof Date ? params.endDate.toISOString() : params.endDate,
		...(params.timeZone && { timeZone: params.timeZone }),
		...(params.groupBy && { groupBy: params.groupBy })
	});

	if (params.activityLevel) {
		baseParams.append('activityLevel[start]', params.activityLevel.start.toString());
		baseParams.append('activityLevel[end]', params.activityLevel.end.toString());
	}

	const arrayParams = {
		projectIds: params.projectIds,
		employeeIds: params.employeeIds,
		taskIds: params.taskIds,
		teamIds: params.teamIds
	};

	Object.entries(arrayParams).forEach(([key, values]) => {
		values?.forEach((value, index) => {
			baseParams.append(`${key}[${index}]`, value);
		});
	});

	return baseParams;
}

export async function getTimeLogReportDailyChartRequest(params: ITimeLogRequestParams, bearer_token?: string) {
	const queries = buildTimeLogParams(params);

	return serverFetch<ITimeLogReportDailyChart[]>({
		path: `/timesheet/time-log/report/daily-chart?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}

export async function getTimeLogReportDailyRequest(params: ITimeLogRequestParams, bearer_token?: string) {
	const queries = buildTimeLogParams(params);

	return serverFetch<ITimeLogGroupedDailyReport[]>({
		path: `/timesheet/time-log/report/daily?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}

/**
 * Fetches activity report data from the API
 * @param params - Parameters for filtering and grouping the activity report
 * @param bearer_token - Optional authentication token
 * @returns Promise with the activity report data
 */
export function getActivityReportRequest(params: IActivityRequestParams, bearer_token?: string) {
	const queries = buildTimeLogParams(params);

	return serverFetch<IActivityReport>({
		path: `/timesheet/activity/report?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}
