import { IGetTimeLimitReport, ITimeLimitReport } from '@/core/types/interfaces/timesheet/ITimeLimitsReport';
import { APIService } from '../../api.service';
import qs from 'qs';

import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL, TIMESHEET_RELATIONS } from '@/core/constants/config/constants';
import { IAddManualTimeRequest } from '@/core/types/interfaces/timer/time-slot/ITimeSlot';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/ITimeLog';
import {
	ITimeLogGroupedDailyReport,
	ITimeLogReportDaily,
	ITimeLogReportDailyChart,
	ITimeLogReportDailyChartProps,
	ITimeLogReportDailyRequest
} from '@/core/types/interfaces/activity/IActivityReport';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/ITimesheet';

class TimeLogService extends APIService {
	getTimeLimitsReport = async (params: IGetTimeLimitReport) => {
		const query = qs.stringify({
			...params
		});

		return await this.get<ITimeLimitReport[]>(`/timesheet/time-log/time-limit?${query}`);
	};

	getTimerLogsDailyReport = async ({
		tenantId,
		organizationId,
		employeeIds,
		startDate,
		endDate
	}: {
		tenantId: string;
		organizationId: string;
		employeeIds: string[];
		startDate: Date;
		endDate: Date;
	}) => {
		const params = {
			tenantId: tenantId,
			organizationId: organizationId,
			employeeIds,
			todayStart: startDate.toISOString(),
			todayEnd: endDate.toISOString()
		};

		const query = qs.stringify(params);

		return this.get<ITimeLogReportDaily[]>(`/timesheet/time-log/report/daily?${query}`);
	};

	addManualTime = async (request: IAddManualTimeRequest) => {
		const { startedAt, stoppedAt, ...rest } = request;
		const data = {
			...rest,
			startedAt: startedAt.toISOString(),
			stoppedAt: stoppedAt.toISOString()
		};

		return this.post<ITimeLog>('/timesheet/time-log', data);
	};

	getTaskTimesheetLogs = async ({
		organizationId,
		tenantId,
		startDate,
		endDate,
		timeZone,
		projectIds = [],
		employeeIds = [],
		taskIds = [],
		status = []
	}: {
		organizationId: string;
		tenantId: string;
		startDate: string | Date;
		endDate: string | Date;
		timeZone?: string;
		projectIds?: string[];
		employeeIds?: string[];
		taskIds?: string[];
		status?: string[];
	}) => {
		if (!organizationId || !tenantId || !startDate || !endDate) {
			throw new Error(
				'Required parameters missing: organizationId, tenantId, startDate, and endDate are required'
			);
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

		return this.get<ITimeLog[]>(`/timesheet/time-log?${params.toString()}`, { tenantId });
	};

	deleteTaskTimesheetLogs = async ({
		logIds,
		organizationId,
		tenantId
	}: {
		organizationId: string;
		tenantId: string;
		logIds: string[];
	}) => {
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
			return await this.delete<{ success: boolean; message: string }>(endPoint, { tenantId });
		} catch (error) {
			throw new Error(`Failed to delete timesheet logs`);
		}
	};

	createTimesheetFrom = async (data: IUpdateTimesheetRequest) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		if (!organizationId || !tenantId) {
			throw new Error('Required parameters missing: organizationId and tenantId are required');
		}
		try {
			return this.post<ITimeLog>('/timesheet/time-log', { ...data, organizationId }, { tenantId });
		} catch (error) {
			throw new Error('Failed to create timesheet log');
		}
	};

	updateTimesheetFrom = async (params: IUpdateTimesheetRequest) => {
		const { id, ...data } = params;
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		if (!organizationId || !tenantId) {
			throw new Error('Required parameters missing: organizationId and tenantId are required');
		}
		try {
			return this.put<ITimeLog>(`/timesheet/time-log/${id}`, { ...data, organizationId }, { tenantId });
		} catch (error) {
			throw new Error('Failed to update timesheet log');
		}
	};

	getTimeLogReportDailyChart = async ({
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
	}: ITimeLogReportDailyChartProps) => {
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
			throw new Error(
				'Required parameters missing: organizationId, tenantId, startDate, and endDate are required'
			);
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

		return this.get<ITimeLogReportDailyChart[]>(`/timesheet/time-log/report/daily-chart?${queryString}`, {
			tenantId
		});
	};

	getTimeLogReportDaily = async ({
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
	}: ITimeLogReportDailyRequest) => {
		if (!organizationId || !tenantId || !startDate || !endDate) {
			throw new Error(
				'Required parameters missing: organizationId, tenantId, startDate, and endDate are required'
			);
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

		return this.get<ITimeLogGroupedDailyReport[]>(`/timesheet/time-log/report/daily?${queryString}`, { tenantId });
	};
}

export const timeLogService = new TimeLogService(GAUZY_API_BASE_SERVER_URL.value);
