import { TimesheetLog, ITimerStatus, IUpdateTimesheetStatus, UpdateTimesheetStatus, UpdateTimesheet, ITimerDailyLog, ITimeLogReportDailyChartProps, ITimerLogGrouped, ITimesheetStatisticsCounts, TimeLogType } from '@app/interfaces';
import { get, deleteApi, put, post } from '../../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import qs from 'qs';

export async function getTimerLogs(
	tenantId: string,
	organizationId: string,
	employeeId: string,
	organizationTeamId: string | null
) {
	const endpoint = `/timer/status?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}&employeeIds[0]=${employeeId}`;

	return get<ITimerStatus>(endpoint, { tenantId });
}

// todayStart, todayEnd;


interface ITaskTimesheetParams {
	organizationId: string;
	tenantId: string;
	startDate: string | Date;
	endDate: string | Date;
	timeZone?: string;
	projectIds?: string[];
	employeeIds?: string[];
	taskIds?: string[];
	status?: string[];
}

const TIMESHEET_RELATIONS = [
	'project',
	'task',
	'organizationContact',
	'employee.user',
	'task.taskStatus',
	'timesheet'
] as const;

export async function getTaskTimesheetLogsApi({
	organizationId,
	tenantId,
	startDate,
	endDate,
	timeZone,
	projectIds = [],
	employeeIds = [],
	taskIds = [],
	status = []
}: ITaskTimesheetParams) {
	if (!organizationId || !tenantId || !startDate || !endDate) {
		throw new Error('Required parameters missing: organizationId, tenantId, startDate, and endDate are required');
	}

	const start = typeof startDate === 'string' ? new Date(startDate).toISOString() : startDate.toISOString();
	const end = typeof endDate === 'string' ? new Date(endDate).toISOString() : endDate.toISOString();

	if (isNaN(new Date(start).getTime()) || isNaN(new Date(end).getTime())) {
		throw new Error('Invalid date format provided');
	}

	const params = new URLSearchParams({
		'activityLevel[start]': '0',
		'activityLevel[end]': '100',
		organizationId,
		tenantId,
		startDate: start,
		endDate: end,
		timeZone: timeZone || getDefaultTimezone()
	});

	TIMESHEET_RELATIONS.forEach((relation, index) => {
		params.append(`relations[${index}]`, relation);
	});

	const addArrayParam = (key: string, values: string[]) => {
		values.forEach((value, index) => {
			if (value) params.append(`${key}[${index}]`, value);
		});
	};

	addArrayParam('projectIds', projectIds);
	addArrayParam('employeeIds', employeeIds);
	addArrayParam('taskIds', taskIds);
	addArrayParam('status', status);

	return get<TimesheetLog[]>(`/timesheet/time-log?${params.toString()}`, { tenantId });
}


export async function deleteTaskTimesheetLogsApi({
	logIds,
	organizationId,
	tenantId
}: {
	organizationId: string,
	tenantId: string,
	logIds: string[]
}) {
	// Validate required parameters
	if (!organizationId || !tenantId || !logIds?.length) {
		throw new Error('Required parameters missing: organizationId, tenantId, and logIds are required');
	}

	// Limit bulk deletion size for safety
	if (logIds.length > 100) {
		throw new Error('Maximum 100 logs can be deleted at once');
	}

	const params = new URLSearchParams({
		organizationId,
		tenantId
	});
	logIds.forEach((id, index) => {
		if (!id) {
			throw new Error(`Invalid logId at index ${index}`);
		}
		params.append(`logIds[${index}]`, id);
	});

	const endPoint = `/timesheet/time-log?${params.toString()}`;
	try {
		return await deleteApi<{ success: boolean; message: string }>(endPoint, { tenantId });
	} catch (error) {
		throw new Error(`Failed to delete timesheet logs`);
	}
}

export function updateStatusTimesheetFromApi(data: IUpdateTimesheetStatus) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	return put<UpdateTimesheetStatus[]>(`/timesheet/status`, { ...data, organizationId }, { tenantId });
}


export function createTimesheetFromApi(data: UpdateTimesheet) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	if (!organizationId || !tenantId) {
		throw new Error('Required parameters missing: organizationId and tenantId are required');
	}
	try {
		return post<TimesheetLog>('/timesheet/time-log', { ...data, organizationId }, { tenantId })
	} catch (error) {
		throw new Error('Failed to create timesheet log');
	}
}

export function updateTimesheetFromAPi(params: UpdateTimesheet) {
	const { id, ...data } = params
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	if (!organizationId || !tenantId) {
		throw new Error('Required parameters missing: organizationId and tenantId are required');
	}
	try {
		return put<TimesheetLog>(`/timesheet/time-log/${id}`, { ...data, organizationId }, { tenantId })
	} catch (error) {
		throw new Error('Failed to create timesheet log');
	}
}

const getDefaultTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function getTimeLogReportDailyChart({
    activityLevel,
    organizationId,
    tenantId,
    startDate,
    endDate,
    timeZone = getDefaultTimezone(),
    groupBy,
    projectIds = [],
    employeeIds = [],
    logType = [],
    teamIds = []
}: ITimeLogReportDailyChartProps) {
    const baseParams = {
        'activityLevel[start]': activityLevel.start.toString(),
        'activityLevel[end]': activityLevel.end.toString(),
        organizationId,
        tenantId,
        startDate,
        endDate,
        timeZone,
        ...(groupBy && { groupBy })
    };

	if (!organizationId || !tenantId || !startDate || !endDate) {
		throw new Error('Required parameters missing: organizationId, tenantId, startDate, and endDate are required');
	}
	if (activityLevel.start < 0 || activityLevel.end > 100 || activityLevel.start >= activityLevel.end) {
		throw new Error('Invalid activity level range');
	}

    const addArrayParams = (params: Record<string, string>, key: string, values: string[]) => {
        values.forEach((value, index) => {
            params[`${key}[${index}]`] = value;
        });
    };

    const queryParams = { ...baseParams };
    if (projectIds.length) addArrayParams(queryParams, 'projectIds', projectIds);
    if (employeeIds.length) addArrayParams(queryParams, 'employeeIds', employeeIds);
    if (logType.length) addArrayParams(queryParams, 'logType', logType);
    if (teamIds.length) addArrayParams(queryParams, 'teamIds', teamIds);

    const queryString = new URLSearchParams(queryParams).toString();

    return get<ITimerDailyLog[]>(
        `/timesheet/time-log/report/daily-chart?${queryString}`,
        { tenantId }
    );
}

interface ITimeLogReportDailyProps {
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

export function getTimeLogReportDaily({
	organizationId,
	tenantId,
	startDate,
	endDate,
	timeZone = getDefaultTimezone(),
	groupBy = 'date',
	projectIds = [],
	employeeIds = [],
	taskIds = [],
	teamIds = [],
	activityLevel = { start: 0, end: 100 }
}: ITimeLogReportDailyProps) {
	if (!organizationId || !tenantId || !startDate || !endDate) {
		throw new Error('Required parameters missing: organizationId, tenantId, startDate, and endDate are required');
	}

	const baseParams: Record<string, string> = {
		'activityLevel[start]': activityLevel.start.toString(),
		'activityLevel[end]': activityLevel.end.toString(),
		organizationId,
		tenantId,
		startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
		endDate: endDate instanceof Date ? endDate.toISOString() : endDate,
		timeZone,
		...(groupBy && { groupBy })
	};

	const addArrayParams = (params: Record<string, string>, key: string, values: string[]) => {
		values.forEach((value, index) => {
			params[`${key}[${index}]`] = value;
		});
	};

	const queryParams = { ...baseParams };
	if (projectIds.length) addArrayParams(queryParams, 'projectIds', projectIds);
	if (employeeIds.length) addArrayParams(queryParams, 'employeeIds', employeeIds);
	if (taskIds.length) addArrayParams(queryParams, 'taskIds', taskIds);
	if (teamIds.length) addArrayParams(queryParams, 'teamIds', teamIds);

	const queryString = new URLSearchParams(queryParams).toString();

	return get<ITimerLogGrouped[]>(`/timesheet/time-log/report/daily?${queryString}`, { tenantId });
}

export interface ITimesheetStatisticsCountsRequest {
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
 * Format duration in seconds to human readable format (HH:mm:ss)
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        remainingSeconds.toString().padStart(2, '0')
    ].join(':');
}

/**
 * Format activity percentage with 2 decimal places
 */
export function formatActivity(activity: number): string {
    return `${activity.toFixed(2)}%`;
}

/**
 * Get timesheet statistics counts
 * @param params Request parameters including activity levels, log types, and date range
 * @returns Promise with statistics counts data
 * @example
 * const { data } = await getTimesheetStatisticsCounts({
 *   activityLevel: { start: 0, end: 100 },
 *   logType: ['TRACKED'],
 *   organizationId: '...',
 *   tenantId: '...',
 *   startDate: '2024-11-30 13:00:00',
 *   endDate: '2024-12-31 12:59:59',
 *   timeZone: 'Australia/Lord_Howe'
 * });
 * 
 * console.log({
 *   employees: data.employeesCount,
 *   projects: data.projectsCount,
 *   weekActivity: formatActivity(data.weekActivities), // "49.93%"
 *   weekDuration: formatDuration(data.weekDuration),   // "106:21:19"
 *   todayActivity: formatActivity(data.todayActivities),
 *   todayDuration: formatDuration(data.todayDuration)
 * });
 */
export async function getTimesheetStatisticsCounts({
	activityLevel,
	logType,
	organizationId,
	tenantId,
	startDate,
	endDate,
	timeZone = 'Etc/UTC'
}: ITimesheetStatisticsCountsRequest): Promise<{ data: ITimesheetStatisticsCounts }> {
	const queryString = qs.stringify(
		{
			activityLevel,
			logType,
			organizationId,
			startDate,
			endDate,
			timeZone
		},
		{
			arrayFormat: 'indices',
			encode: true,
			strictNullHandling: true
		}
	);
	return get<ITimesheetStatisticsCounts>(`/timesheet/statistics/counts?${queryString}`, { tenantId });
}
