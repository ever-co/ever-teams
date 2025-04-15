/* eslint-disable no-mixed-spaces-and-tabs */
import { DeleteResponse, PaginationResponse } from '@app/interfaces/IDataResponse';
import { ICreateTask, ITeamTask } from '@app/interfaces/ITask';
import { ITasksTimesheet } from '@app/interfaces/ITimer';
import api, { deleteApi, get, post, put } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@app/helpers';
import { TTasksTimesheetStatisticsParams } from '@app/services/server/requests';
import qs from 'qs';

export function getTasksByIdAPI(taskId: string) {
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

	return get<ITeamTask>(endpoint);
}

export async function getTeamTasksAPI(organizationId: string, tenantId: string, projectId: string, teamId: string) {
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

	return get<PaginationResponse<ITeamTask>>(endpoint, { tenantId });
}

export function deleteTaskAPI(taskId: string) {
	return deleteApi<DeleteResponse>(`/tasks/${taskId}`);
}

export async function updateTaskAPI(taskId: string, body: Partial<ITeamTask>) {
	if (GAUZY_API_BASE_SERVER_URL.value) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		const teamId = getActiveTeamIdCookie();
		const projectId = getActiveProjectIdCookie();

		const nBody = { ...body };
		delete nBody.selectedTeam;
		delete nBody.rootEpic;

		await put(`/tasks/${taskId}`, nBody);

		return getTeamTasksAPI(organizationId, tenantId, projectId, teamId);
	}

	return put<PaginationResponse<ITeamTask>>(`/tasks/${taskId}`, body);
}

export async function createTeamTaskAPI(body: Partial<ICreateTask> & { title: string }) {
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

		await post('/tasks', datas, { tenantId });

		return getTeamTasksAPI(organizationId, tenantId, projectId, teamId);
	}

	return api.post<PaginationResponse<ITeamTask>>('/tasks/team', body);
}

export async function tasksTimesheetStatisticsAPI(
	tenantId: string,
	activeTaskId: string,
	organizationId: string,
	employeeId?: string
) {
	try {
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

			const globalData = await post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${globalQueries}`, {
				tenantId
			});

			const todayQueries = qs.stringify({
				...commonParams,
				defaultRange: 'true',
				unitOfTime: 'day'
			});
			const todayData = await post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${todayQueries}`, {
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
}

export async function activeTaskTimesheetStatisticsAPI(
	tenantId: string,
	activeTaskId: string,
	organizationId: string,
	employeeId?: string
) {
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
			...(activeTaskId ? { 'taskIds[0]': activeTaskId } : {}),
			...employeesParams
		};
		const globalQueries = qs.stringify({
			...commonParams,
			defaultRange: 'false'
		});
		const globalData = await post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${globalQueries}`, {
			tenantId
		});

		const todayQueries = qs.stringify({ ...commonParams, defaultRange: 'true', unitOfTime: 'day' });
		const todayData = await post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${todayQueries}`, {
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
}

export function allTaskTimesheetStatisticsAPI() {
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

		return post<ITasksTimesheet[]>(`/timesheet/statistics/tasks?${queries.toString()}`, { tenantId });
	}

	return api.get<ITasksTimesheet[]>(`/timer/timesheet/all-statistics-tasks`);
}

export function deleteEmployeeFromTasksAPI(employeeId: string, organizationTeamId: string) {
	return deleteApi<DeleteResponse>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
}

export function getTasksByEmployeeIdAPI(employeeId: string, organizationTeamId: string) {
	return get<ITeamTask[]>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
}
