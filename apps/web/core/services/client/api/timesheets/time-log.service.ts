import { APIService } from '../../api.service';
import qs from 'qs';

import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { GAUZY_API_BASE_SERVER_URL, TIMESHEET_RELATIONS } from '@/core/constants/config/constants';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	TAddManualTimeRequest,
	timeLogSchema,
	TTimeLog,
	timeLogReportDailySchema,
	TTimeLogReportDaily,
	TGetTimerLogsDailyReportRequest
} from '@/core/types/schemas';
import {
	ITimeLogGroupedDailyReport,
	ITimeLogReportDailyChart,
	ITimeLogReportDailyChartProps,
	ITimeLogReportDailyRequest
} from '@/core/types/interfaces/activity/activity-report';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { formatStartAndEndDateRange } from '@/core/lib/helpers/format-date-range';
import {
	validateApiResponse,
	timeLimitReportListSchema,
	ZodValidationError,
	TGetTimeLimitReport,
	TTimeLimitReportList
} from '@/core/types/schemas';

class TimeLogService extends APIService {
	getTimeLimitsReport = async (params: TGetTimeLimitReport): Promise<TTimeLimitReportList[]> => {
		const query = qs.stringify({
			...params,
			tenantId: this.tenantId,
			organizationId: this.organizationId
		});

		try {
			const response = await this.get<TTimeLimitReportList[]>(`/timesheet/time-log/time-limit?${query}`);

			// Validate the response data using Zod schema
			return validateApiResponse(
				timeLimitReportListSchema.array(),
				response.data,
				'getTimeLimitsReport API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Time limits report validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	/**
	 * Get timer logs daily report
	 *
	 * @param params - Timer logs daily report request parameters
	 * @returns Promise<TTimeLogReportDaily[]> - Validated timer logs daily report data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTimerLogsDailyReport = async (params: TGetTimerLogsDailyReportRequest): Promise<TTimeLogReportDaily[]> => {
		try {
			const queryParams = {
				'activityLevel[start]': '0',
				'activityLevel[end]': '100',
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				timeZone: params.timeZone || getDefaultTimezone(),
				...params
			};

			const query = qs.stringify(queryParams);

			const response = await this.get<TTimeLogReportDaily[]>(`/timesheet/time-log/report/daily?${query}`);

			// Validate the response data using Zod schema
			if (Array.isArray(response.data)) {
				const validatedReports = response.data.map((report, index) =>
					validateApiResponse(
						timeLogReportDailySchema,
						report,
						`getTimerLogsDailyReport API response item ${index}`
					)
				);
				return validatedReports;
			}

			// If response.data is not an array, return empty array
			return [];
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Timer logs daily report validation failed:',
					{
						message: error.message,
						issues: error.issues,
						tenantId: this.tenantId,
						organizationId: this.organizationId,
						employeeIds: params.employeeIds
					},
					'TimeLogService'
				);
			}
			throw error;
		}
	};

	addManualTime = async (request: TAddManualTimeRequest): Promise<TTimeLog> => {
		try {
			const { startedAt, stoppedAt, ...rest } = request;
			const data = {
				...rest,
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				startedAt: startedAt.toISOString(),
				stoppedAt: stoppedAt.toISOString()
			};

			const response = await this.post<TTimeLog>('/timesheet/time-log', data);

			// Validate the response data using Zod schema
			return validateApiResponse(timeLogSchema, response.data, 'addManualTime API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Add manual time validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	getTimeLogs = async ({
		startDate,
		endDate,
		timeZone,
		projectIds = [],
		employeeIds = [],
		taskIds = [],
		status = []
	}: TGetTimerLogsDailyReportRequest) => {
		if (!startDate || !endDate) {
			throw new Error('Required parameters missing: startDate, and endDate are required');
		}

		// Format dates using the utility function
		const { start, end } = formatStartAndEndDateRange(startDate, endDate);

		const params = new URLSearchParams({
			'activityLevel[start]': '0',
			'activityLevel[end]': '100',
			organizationId: this.organizationId,
			tenantId: this.tenantId,
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

		const response = await this.get<ITimeLog[]>(`/timesheet/time-log?${params.toString()}`, {
			tenantId: this.tenantId
		});

		return response.data;
	};

	deleteTaskTimesheetLogs = async ({ logIds }: { logIds: string[] }) => {
		// Validate required parameters
		if (!this.organizationId || !this.tenantId || !logIds?.length) {
			throw new Error('Required parameters missing: organizationId, tenantId, and logIds are required');
		}

		// Limit bulk deletion size for safety
		if (logIds.length > 100) {
			throw new Error('Maximum 100 logs can be deleted at once');
		}

		const params = new URLSearchParams({
			organizationId: this.organizationId,
			tenantId: this.tenantId
		});
		logIds.forEach((id, index) => {
			if (!id) {
				throw new Error(`Invalid logId at index ${index}`);
			}
			params.append(`logIds[${index}]`, id);
		});

		const endPoint = `/timesheet/time-log?${params.toString()}`;
		try {
			return await this.delete<{ success: boolean; message: string }>(endPoint, {
				tenantId: this.tenantId
			});
		} catch (error) {
			throw new Error(`Failed to delete timesheet logs`);
		}
	};

	createTimesheetFrom = async (data: IUpdateTimesheetRequest) => {
		if (!this.organizationId || !this.tenantId) {
			throw new Error('Required parameters missing: organizationId and tenantId are required');
		}
		try {
			return this.post<ITimeLog>(
				'/timesheet/time-log',
				{ ...data, organizationId: this.organizationId },
				{ tenantId: this.tenantId }
			);
		} catch (error) {
			throw new Error('Failed to create timesheet log');
		}
	};

	updateTimesheetFrom = async (params: IUpdateTimesheetRequest) => {
		const { id, ...data } = params;
		if (!this.organizationId || !this.tenantId) {
			throw new Error('Required parameters missing: organizationId and tenantId are required');
		}
		try {
			return this.put<ITimeLog>(
				`/timesheet/time-log/${id}`,
				{ ...data, organizationId: this.organizationId },
				{ tenantId: this.tenantId }
			);
		} catch (error) {
			throw new Error('Failed to update timesheet log');
		}
	};

	getTimeLogReportDailyChart = async ({
		activityLevel,
		startDate,
		endDate,
		timeZone = getDefaultTimezone(),
		groupBy,
		projectIds = [],
		employeeIds = [],
		logType = [],
		teamIds = []
	}: ITimeLogReportDailyChartProps) => {
		if (!this.organizationId || !this.tenantId || !startDate || !endDate) {
			throw new Error(
				'Required parameters missing: organizationId, tenantId, startDate, and endDate are required'
			);
		}
		if (activityLevel.start < 0 || activityLevel.end > 100 || activityLevel.start >= activityLevel.end) {
			throw new Error('Invalid activity level range');
		}

		// Format dates using the utility function
		const { start: formattedStartDate, end: formattedEndDate } = formatStartAndEndDateRange(startDate, endDate);

		const baseParams = {
			'activityLevel[start]': activityLevel.start.toString(),
			'activityLevel[end]': activityLevel.end.toString(),
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			startDate: formattedStartDate,
			endDate: formattedEndDate,
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
		if (logType.length) addArrayParams(queryParams, 'logType', logType);
		if (teamIds.length) addArrayParams(queryParams, 'teamIds', teamIds);

		const queryString = new URLSearchParams(queryParams).toString();

		return this.get<ITimeLogReportDailyChart[]>(`/timesheet/time-log/report/daily-chart?${queryString}`, {
			tenantId: this.tenantId
		});
	};

	getTimeLogReportDaily = async ({
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
		if (!this.organizationId || !this.tenantId || !startDate || !endDate) {
			throw new Error(
				'Required parameters missing: organizationId, tenantId, startDate, and endDate are required'
			);
		}

		// Format dates using the utility function
		const { start: formattedStartDate, end: formattedEndDate } = formatStartAndEndDateRange(startDate, endDate);

		const baseParams: Record<string, string> = {
			'activityLevel[start]': activityLevel.start.toString(),
			'activityLevel[end]': activityLevel.end.toString(),
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			startDate: formattedStartDate,
			endDate: formattedEndDate,
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

		return this.get<ITimeLogGroupedDailyReport[]>(`/timesheet/time-log/report/daily?${queryString}`, {
			tenantId: this.tenantId
		});
	};
}

export const timeLogService = new TimeLogService(GAUZY_API_BASE_SERVER_URL.value);
