import { ITasksTimesheet, TimeLogType } from '@app/interfaces/ITimer';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { ITimerDailyLog, ITimerLogGrouped, TimesheetLog, UpdateTimesheet, UpdateTimesheetStatus } from '@/app/interfaces/timer/ITimerLog';
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
    logType: TimeLogType[];
    organizationId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    timeZone?: string;
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
): Promise<{ data: ITimesheetStatisticsCountsProps }> {
    const queries = qs.stringify(params, {
        arrayFormat: 'indices',
        encode: true,
        strictNullHandling: true
    });

    return serverFetch<ITimesheetStatisticsCountsProps>({
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

export async function getTimeLogReportDailyChartRequest(
	params: ITimeLogRequestParams,
	bearer_token?: string
) {
	const queries = buildTimeLogParams(params);

	return serverFetch<ITimerDailyLog[]>({
		path: `/timesheet/time-log/report/daily-chart?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}

export async function getTimeLogReportDailyRequest(
	params: ITimeLogRequestParams,
	bearer_token?: string
) {
	const queries = buildTimeLogParams(params);

	return serverFetch<ITimerLogGrouped[]>({
		path: `/timesheet/time-log/report/daily?${queries}`,
		method: 'GET',
		bearer_token,
		tenantId: params.tenantId
	});
}
