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

	// return api.get<PaginationResponse<ITeamTask>>('/tasks/team');
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

export function tasksTimesheetStatisticsAPI(employeeId?: string) {
	return api.get<{ global: ITasksTimesheet[]; today: ITasksTimesheet[] }>(
		`/timer/timesheet/statistics-tasks${employeeId ? '?employeeId=' + employeeId : ''}`
	);
}

export function activeTaskTimesheetStatisticsAPI() {
	return api.get<{ global: ITasksTimesheet[]; today: ITasksTimesheet[] }>(
		`/timer/timesheet/statistics-tasks?activeTask=true`
	);
}

export function allTaskTimesheetStatisticsAPI() {
	return api.get<ITasksTimesheet[]>(`/timer/timesheet/all-statistics-tasks`);
}

export function deleteEmployeeFromTasksAPI(employeeId: string, organizationTeamId: string) {
	return api.delete<DeleteResponse>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
}
