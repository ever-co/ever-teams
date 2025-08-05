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
	TGetTimerLogsRequest,
	TTimerSlotDataRequest
} from '@/core/types/schemas';

class StatisticsService extends APIService {
	getTimerLogsRequest = async (params: TGetTimerLogsRequest): Promise<TTimerSlotDataRequest[]> => {
		try {
			const queryParams = {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				employeeId: params.employeeId,
				todayEnd: params.todayEnd.toISOString(),
				todayStart: params.todayStart.toISOString()
			} as Record<string, string>;

			const relations = ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId'];

			relations.forEach((rl, i) => {
				queryParams[`relations[${i}]`] = rl;
			});

			const query = qs.stringify(queryParams);

			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/timesheet/statistics/time-slots?${query}`
				: `/timer/slots?${query}`;

			const response = await this.get<TTimerSlotDataRequest | TTimerSlotDataRequest[]>(endpoint);

			// Validate the response data
			const responseData = Array.isArray(response.data) ? response.data : [response.data];

			return validateApiResponse(
				timerSlotDataRequestSchema.array(),
				responseData,
				'getTimerLogsRequest API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Timer logs request validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	getStatisticsForTasks = async (queries: Record<string, string>, tenantId: string) => {
		const query = qs.stringify(queries);

		return await this.post<ITasksStatistics[]>(`/timesheet/statistics/tasks?${query}`, {
			tenantId
		});
	};

	tasksTimesheetStatistics = async ({ activeTaskId, employeeId }: { activeTaskId?: string; employeeId?: string }) => {
		const api = await getFallbackAPI();
		try {
			if (!this.tenantId || !this.organizationId) {
				throw new Error('TenantId and OrganizationId are required');
			}

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const employeesParams = employeeId
					? [employeeId].reduce((acc: any, v, i) => {
							acc[`employeeIds[${i}]`] = v;
							return acc;
						})
					: {};
				const commonParams = {
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					// ...(activeTaskId ? { 'taskIds[0]': activeTaskId } : {}),
					...employeesParams
				};
				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams, this.tenantId);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams, this.tenantId);

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
				const employeesParams = employeeId
					? [employeeId].reduce((acc: any, v, i) => {
							acc[`employeeIds[${i}]`] = v;
							return acc;
						}, {})
					: {};

				const commonParams = {
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					'taskIds[0]': activeTaskId,
					...employeesParams
				};

				const globalQueries = qs.stringify({
					...commonParams,
					defaultRange: 'false'
				});
				const globalData = await this.post<ITasksStatistics[]>(`/timesheet/statistics/tasks?${globalQueries}`, {
					tenantId: this.tenantId
				});

				const todayQueries = qs.stringify({ ...commonParams, defaultRange: 'true', unitOfTime: 'day' });
				const todayData = await this.post<ITasksStatistics[]>(`/timesheet/statistics/tasks?${todayQueries}`, {
					tenantId: this.tenantId
				});

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

			return this.post<ITasksStatistics[]>(`/timesheet/statistics/tasks?${queries.toString()}`, {
				tenantId: this.tenantId
			});
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
