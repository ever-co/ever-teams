import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TTasksTimesheetStatisticsParams } from '../../../server/requests';
import { ITasksStatistics } from '@/core/types/interfaces/task/task';
import { ITimeLogReportDailyRequest } from '@/core/types/interfaces/activity/activity-report';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import {
	validateApiResponse,
	timerSlotDataRequestSchema,
	ZodValidationError,
	TGetTimeSlotsStatisticsRequest,
	TTimerSlotDataRequest
} from '@/core/types/schemas';

class StatisticsService extends APIService {
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

	getStatisticsForTasks = async (queries: Record<string, string | string[] | number>) => {
		const query = qs.stringify(queries, { arrayFormat: 'indices' });

		return await this.post<ITasksStatistics[]>(`/timesheet/statistics/tasks?${query}`, {
			tenantId: this.tenantId
		});
	};

	tasksTimesheetStatistics = async ({ employeeId }: { employeeId?: string }) => {
		const api = await getFallbackAPI();
		try {
			if (!this.tenantId || !this.organizationId) {
				throw new Error('TenantId and OrganizationId are required');
			}

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const commonParams = {
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					...(employeeId ? { employeeIds: [employeeId] } : {})
				};
				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams);

				return {
					data: {
						global: globalData.data,
						today: todayData.data
					}
				};
			} else {
				return api.get<{ global: ITasksStatistics[]; today: ITasksStatistics[] }>(
					`/timer/timesheet/statistics-tasks${employeeId ? '?employeeId=' + employeeId : ''}`
				);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	};

	activeTaskTimesheetStatistics = async ({
		activeTaskId,
		employeeId
	}: {
		activeTaskId: string;
		employeeId?: string;
	}) => {
		try {
			if (!this.tenantId || !this.organizationId || !activeTaskId) {
				throw new Error('TenantId, OrganizationId, and ActiveTaskId are required');
			}

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const commonParams = {
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					taskIds: [activeTaskId],
					...(employeeId ? { employeeIds: [employeeId] } : {})
				};

				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams);

				return {
					data: {
						global: globalData.data,
						today: todayData.data
					}
				};
			} else {
				const api = await getFallbackAPI();
				return api.get<{ global: ITasksStatistics[]; today: ITasksStatistics[] }>(
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
		return api.get<ITasksStatistics[]>(`/timer/timesheet/all-statistics-tasks`);
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
