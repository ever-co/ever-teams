import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, ICreateTask, ITasksTimesheet, ITeamTask, PaginationResponse } from '@/core/types/interfaces';
import api from '../../axios';
import { TTasksTimesheetStatisticsParams } from '@/core/services/server/requests';

class TaskService extends APIService {
	getTasksById = async (taskId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const relations = [
			'tags',
			'teams',
			'members',
			'members.user',
			'createdByUser',
			'linkedIssues',
			'linkedIssues.taskTo',
			'linkedIssues.taskFrom',
			'parent',
			'children'
		];

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'join[alias]': 'task',
			'join[leftJoinAndSelect][members]': 'task.members',
			'join[leftJoinAndSelect][user]': 'members.user',
			includeRootEpic: 'true'
		} as Record<string, string>;

		relations.forEach((rl, i) => {
			obj[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(obj);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`;

		return this.get<ITeamTask>(endpoint);
	};

	getTeamTasks = async (organizationId: string, tenantId: string, projectId: string, teamId: string) => {
		const relations = [
			'tags',
			'teams',
			'members',
			'members.user',
			'createdByUser',
			'linkedIssues',
			'linkedIssues.taskTo',
			'linkedIssues.taskFrom',
			'parent',
			'children'
		];

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'where[projectId]': projectId,
			'join[alias]': 'task',
			'join[leftJoinAndSelect][members]': 'task.members',
			'join[leftJoinAndSelect][user]': 'members.user',
			'where[teams][0]': teamId
		} as Record<string, string>;

		relations.forEach((rl, i) => {
			obj[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(obj);
		const endpoint = `/tasks/team?${query}`;

		return this.get<PaginationResponse<ITeamTask>>(endpoint, { tenantId });
	};

	deleteTask = async (taskId: string) => {
		return this.delete<DeleteResponse>(`/tasks/${taskId}`);
	};

	updateTask = async (taskId: string, body: Partial<ITeamTask>) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const teamId = getActiveTeamIdCookie();
			const projectId = getActiveProjectIdCookie();

			const nBody = { ...body };
			delete nBody.selectedTeam;
			delete nBody.rootEpic;

			await this.put(`/tasks/${taskId}`, nBody);

			return this.getTeamTasks(organizationId, tenantId, projectId, teamId);
		}

		return this.put<PaginationResponse<ITeamTask>>(`/tasks/${taskId}`, body);
	};

	createTeamTask = async (body: Partial<ICreateTask> & { title: string }) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const organizationId = getOrganizationIdCookie();
			const teamId = getActiveTeamIdCookie();
			const tenantId = getTenantIdCookie();
			const projectId = getActiveProjectIdCookie();
			const title = body.title.trim() || '';

			const datas: ICreateTask = {
				description: '',
				teams: [
					{
						id: teamId
					}
				],
				tags: [],
				organizationId,
				tenantId,
				projectId,
				estimate: 0,
				...body,
				title // this must be called after ...body
			};

			await this.post('/tasks', datas, { tenantId });

			return this.getTeamTasks(organizationId, tenantId, projectId, teamId);
		}

		return api.post<PaginationResponse<ITeamTask>>('/tasks/team', body);
	};

	tasksTimesheetStatistics = async (
		tenantId: string,
		activeTaskId: string,
		organizationId: string,
		employeeId?: string
	) => {
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
				const globalQueries = qs.stringify({
					...commonParams,
					defaultRange: 'false'
				});

				const globalData = await this.post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${globalQueries}`, {
					tenantId
				});

				const todayQueries = qs.stringify({
					...commonParams,
					defaultRange: 'true',
					unitOfTime: 'day'
				});
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

		return api.get<ITasksTimesheet[]>(`/timer/timesheet/all-statistics-tasks`);
	};

	deleteEmployeeFromTasks = async (employeeId: string, organizationTeamId: string) => {
		return this.delete<DeleteResponse>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
	};

	getTasksByEmployeeId = async (employeeId: string, organizationTeamId: string) => {
		return this.get<ITeamTask[]>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
	};
}

export const taskService = new TaskService(GAUZY_API_BASE_SERVER_URL.value);
