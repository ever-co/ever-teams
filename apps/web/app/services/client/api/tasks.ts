/* eslint-disable no-mixed-spaces-and-tabs */
import { CreateResponse, DeleteResponse, PaginationResponse } from '@app/interfaces/IDataResponse';
import { ICreateTask, ITeamTask } from '@app/interfaces/ITask';
import { ITasksTimesheet } from '@app/interfaces/ITimer';
import api, { get } from '../axios';

export function getTasksByIdAPI(taskId: string) {
	return api.get<CreateResponse<ITeamTask>>(`/tasks/${taskId}`);
}

export async function getTeamTasksAPI(organizationId: string, tenantId: string, projectId: string, teamId: string) {
	const relations = [
		'tags',
		'teams',
		'members',
		'members.user',
		'creator',
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

	const query = new URLSearchParams(obj);
	const endpoint = `/tasks/team?${query.toString()}`;
	const data = await get(endpoint, true, { tenantId });

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}

export function deleteTaskAPI(taskId: string) {
	return api.delete<DeleteResponse>(`/tasks/${taskId}`);
}

export function updateTaskAPI(taskId: string, body: Partial<ITeamTask>) {
	return api.put<PaginationResponse<ITeamTask>>(`/tasks/${taskId}`, body);
}

export function createTeamTaskAPI(body: Partial<ICreateTask> & { title: string }) {
	return api.post<PaginationResponse<ITeamTask>>('/tasks/team', body);
}

export async function tasksTimesheetStatisticsAPI(
	tenantId: string,
	activeTaskId: string,
	organizationId: string,
	employeeId?: string
) {
	if (process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL) {
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
		const globalQueries = new URLSearchParams({
			...commonParams,
			defaultRange: 'false'
		});
		const globalData = await get(`/timesheet/statistics/tasks?${globalQueries.toString()}`, true, {
			tenantId
		});

		const todayQueries = new URLSearchParams({
			defaultRange: 'true',
			unitOfTime: 'day'
		});
		const todayData = await get(`/timesheet/statistics/tasks?${todayQueries.toString()}`, true, {
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
}

export async function activeTaskTimesheetStatisticsAPI(
	tenantId: string,
	activeTaskId: string,
	organizationId: string,
	employeeId?: string
) {
	if (process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL) {
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
		const globalQueries = new URLSearchParams({
			...commonParams,
			defaultRange: 'false'
		});
		const globalData = await get(`/timesheet/statistics/tasks?${globalQueries.toString()}`, true, {
			tenantId
		});

		const todayQueries = new URLSearchParams({
			defaultRange: 'true',
			unitOfTime: 'day'
		});
		const todayData = await get(`/timesheet/statistics/tasks?${todayQueries.toString()}`, true, {
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
	return api.get<ITasksTimesheet[]>(`/timer/timesheet/all-statistics-tasks`);
}

export function deleteEmployeeFromTasksAPI(employeeId: string, organizationTeamId: string) {
	return api.delete<DeleteResponse>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
}
