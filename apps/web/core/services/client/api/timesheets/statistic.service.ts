import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TTasksTimesheetStatisticsParams } from '../../../server/requests';
import { ITimeLogReportDailyRequest } from '@/core/types/interfaces/activity/activity-report';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import {
	validateApiResponse,
	timerSlotDataRequestSchema,
	ZodValidationError,
	TGetTimeSlotsStatisticsRequest,
	TTimerSlotDataRequest
} from '@/core/types/schemas';
import { taskStatisticsSchema, TTaskStatistics } from '@/core/types/schemas/activities/statistics.schema';
import {
	profileActivityRequestSchema,
	profileActivityResponseSchema,
	type TProfileActivityRequest,
	type TProfileActivityResponse
} from '@/core/types/schemas/activities/profile-activity.schema';
import { scopedReadConfig, type ScopedReadOptions } from '../../api-request-scope';

class StatisticsService extends APIService {
	getProfileActivity = async (
		request: TProfileActivityRequest,
		signal?: AbortSignal
	): Promise<TProfileActivityResponse> => {
		const validated = profileActivityRequestSchema.parse(request);
		const { tenantId, ...queryParams } = validated;
		const query = qs.stringify(queryParams, { encode: true });
		const response = await this.get<TProfileActivityResponse>(`/timesheet/statistics/profile-activity?${query}`, {
			tenantId,
			signal
		});
		const result = profileActivityResponseSchema.parse(response.data);

		if (
			result.employeeId !== validated.employeeId ||
			result.period.startDate !== validated.startDate ||
			result.period.endDate !== validated.endDate ||
			result.period.timeZone !== validated.timeZone ||
			(validated.includeDaily === true && result.daily === undefined)
		) {
			throw new Error('Profile activity response scope does not match the request');
		}

		return result;
	};

	getTimeSlotsStatistics = async (params: TGetTimeSlotsStatisticsRequest): Promise<TTimerSlotDataRequest[]> => {
		try {
			const queryParams = {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				employeeId: params.employeeId,
				todayEnd: params.todayEnd.toISOString(),
				todayStart: params.todayStart.toISOString(),
				relations: ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId']
			} satisfies Record<string, string | string[] | number>;

			const query = qs.stringify(queryParams, { arrayFormat: 'indices' });

			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/timesheet/statistics/time-slots?${query}`
				: `/timer/slots?${query}`;

			const response = await this.get<TTimerSlotDataRequest | TTimerSlotDataRequest[]>(endpoint);

			// Validate the response data
			const responseData = Array.isArray(response.data) ? response.data : [response.data];

			return validateApiResponse(
				timerSlotDataRequestSchema.array(),
				responseData,
				'getTimeSlotsStatistics API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Time slots statistics request validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	getStatisticsForTasks = async (
		queries: Record<string, string | string[] | number>,
		options?: ScopedReadOptions
	) => {
		try {
			const query = qs.stringify(queries, { arrayFormat: 'indices' });

			const response = await this.post<TTaskStatistics>(
				`/timesheet/statistics/tasks?${query}`,
				{ tenantId: options?.scope.tenantId ?? this.tenantId },
				options ? scopedReadConfig(options) : undefined
			);

			return validateApiResponse(taskStatisticsSchema, response.data, 'getStatisticsForTasks API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Tasks statistics validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	tasksTimesheetStatistics = async ({
		employeeId,
		options
	}: {
		employeeId?: string;
		options?: ScopedReadOptions;
	}) => {
		const api = await getFallbackAPI();
		try {
			const tenantId = options?.scope.tenantId ?? this.tenantId;
			const organizationId = options?.scope.organizationId ?? this.organizationId;
			if (!tenantId || !organizationId) {
				throw new Error('TenantId and OrganizationId are required');
			}

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const commonParams = {
					tenantId,
					organizationId,
					...(employeeId ? { employeeIds: [employeeId] } : {})
				};
				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams, options);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams, options);

				return {
					data: {
						global: globalData,
						today: todayData
					}
				};
			} else {
				return api.get<{ global: TTaskStatistics; today: TTaskStatistics }>(
					`/timer/timesheet/statistics-tasks${employeeId ? '?employeeId=' + employeeId : ''}`
				);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	};

	activeTaskTimesheetStatistics = async ({
		activeTaskId,
		employeeId,
		options
	}: {
		activeTaskId: string;
		employeeId?: string;
		options?: ScopedReadOptions;
	}) => {
		try {
			const tenantId = options?.scope.tenantId ?? this.tenantId;
			const organizationId = options?.scope.organizationId ?? this.organizationId;
			if (!tenantId || !organizationId || !activeTaskId) {
				throw new Error('TenantId, OrganizationId, and ActiveTaskId are required');
			}

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const commonParams = {
					tenantId,
					organizationId,
					taskIds: [activeTaskId],
					...(employeeId ? { employeeIds: [employeeId] } : {})
				};

				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams, options);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams, options);

				return {
					data: {
						global: globalData,
						today: todayData
					}
				};
			} else {
				const api = await getFallbackAPI();
				return api.get<{ global: TTaskStatistics; today: TTaskStatistics }>(
					`/timer/timesheet/statistics-tasks?activeTask=true`
				);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	};

	allTaskTimesheetStatistics = async () => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const params: TTasksTimesheetStatisticsParams = {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				employeeIds: [],
				defaultRange: 'false'
			};

			return this.getStatisticsForTasks(params);
		}

		const api = await getFallbackAPI();
		return api.get<TTaskStatistics>(`/timer/timesheet/all-statistics-tasks`);
	};

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
	getTimesheetStatisticsCounts = async ({
		activityLevel,
		logType,
		startDate,
		endDate,
		timeZone = 'Etc/UTC'
	}: ITimeLogReportDailyRequest): Promise<{ data: ITimesheetCountsStatistics }> => {
		const queryString = qs.stringify(
			{
				activityLevel,
				logType,
				organizationId: this.organizationId,
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
		return this.get<ITimesheetCountsStatistics>(`/timesheet/statistics/counts?${queryString}`, {
			tenantId: this.tenantId
		});
	};
}

export const statisticsService = new StatisticsService(GAUZY_API_BASE_SERVER_URL.value);
