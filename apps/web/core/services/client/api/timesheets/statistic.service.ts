import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	ITasksTimesheet,
	ITimeLogReportDailyProps,
	ITimerSlotDataRequest,
	ITimesheetStatisticsData
} from '@/core/types/interfaces';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { TTasksTimesheetStatisticsParams } from '../../../server/requests';

class StatisticsService extends APIService {
	getTimerLogsRequest = async ({
		tenantId,
		organizationId,
		employeeId,
		todayEnd,
		todayStart
	}: {
		tenantId: string;
		organizationId: string;
		employeeId: string;
		todayEnd: Date;
		todayStart: Date;
	}) => {
		const params = {
			tenantId: tenantId,
			organizationId: organizationId,
			employeeId,
			todayEnd: todayEnd.toISOString(),
			todayStart: todayStart.toISOString()
		} as Record<string, string>;

		const relations = ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId'];

		relations.forEach((rl, i) => {
			params[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/statistics/time-slots?${query}`
			: `/timer/slots?${query}`;

		return this.get<ITimerSlotDataRequest | ITimerSlotDataRequest[]>(endpoint);
	};

	getStatisticsForTasks = async (queries: Record<string, string>, tenantId: string) => {
		const query = qs.stringify(queries);

		return await this.post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${query}`, {
			tenantId
		});
	};

	tasksTimesheetStatistics = async (
		tenantId: string,
		activeTaskId: string,
		organizationId: string,
		employeeId?: string
	) => {
		const api = await getFallbackAPI();
		try {
			if (!tenantId || !organizationId) {
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
					tenantId,
					organizationId,
					// ...(activeTaskId ? { 'taskIds[0]': activeTaskId } : {}),
					...employeesParams
				};
				const globalParams = {
					...commonParams,
					defaultRange: 'false'
				};

				const globalData = await this.getStatisticsForTasks(globalParams, tenantId);

				const todayParams = {
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				};
				const todayData = await this.getStatisticsForTasks(todayParams, tenantId);

				return {
					data: {
						global: globalData.data,
						today: todayData.data
					}
				};
			} else {
				return api.get<{ global: ITasksTimesheet[]; today: ITasksTimesheet[] }>(
					`/timer/timesheet/statistics-tasks${employeeId ? '?employeeId=' + employeeId : ''}`
				);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	};

	activeTaskTimesheetStatistics = async (
		tenantId: string,
		activeTaskId: string,
		organizationId: string,
		employeeId?: string
	) => {
		try {
			if (!tenantId || !organizationId || !activeTaskId) {
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
					tenantId,
					organizationId,
					'taskIds[0]': activeTaskId,
					...employeesParams
				};

				const globalQueries = qs.stringify({
					...commonParams,
					defaultRange: 'false'
				});
				const globalData = await this.post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${globalQueries}`, {
					tenantId
				});

				const todayQueries = qs.stringify({ ...commonParams, defaultRange: 'true', unitOfTime: 'day' });
				const todayData = await this.post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${todayQueries}`, {
					tenantId
				});

				return {
					data: {
						global: globalData.data,
						today: todayData.data
					}
				};
			} else {
				const api = await getFallbackAPI();
				return api.get<{ global: ITasksTimesheet[]; today: ITasksTimesheet[] }>(
					`/timer/timesheet/statistics-tasks?activeTask=true`
				);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	};

	allTaskTimesheetStatistics = async () => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();

			const params: TTasksTimesheetStatisticsParams = {
				tenantId,
				organizationId,
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

			return this.post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${queries.toString()}`, { tenantId });
		}

		const api = await getFallbackAPI();
		return api.get<ITasksTimesheet[]>(`/timer/timesheet/all-statistics-tasks`);
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
		organizationId,
		tenantId,
		startDate,
		endDate,
		timeZone = 'Etc/UTC'
	}: ITimeLogReportDailyProps): Promise<{ data: ITimesheetStatisticsData }> => {
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
		return this.get<ITimesheetStatisticsData>(`/timesheet/statistics/counts?${queryString}`, { tenantId });
	};
}

export const statisticsService = new StatisticsService(GAUZY_API_BASE_SERVER_URL.value);
