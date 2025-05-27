import { ITask } from '@/core/types/interfaces/task/ITask';
import { ICreateTask } from '@/core/types/interfaces/task/ITask';
import { serverFetch } from '../fetch';
import { IUser } from '@/core/types/interfaces/user/IUser';
import { DeleteResponse, PaginationResponse, SingleDataResponse } from '@/core/types/interfaces/global/IDataResponse';
import qs from 'qs';

export function getTeamTasksRequest({
	tenantId,
	organizationId,
	projectId,
	teamId,
	bearer_token,
	relations = [
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
	]
}: {
	tenantId: string;
	organizationId: string;
	bearer_token: string;
	relations?: string[];
	projectId?: string;
	teamId: string;
}) {
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

	return serverFetch<PaginationResponse<ITask>>({
		path: `/tasks/team?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function getTeamTasksIRequest({
	tenantId,
	bearer_token,
	query
}: {
	tenantId: string;
	bearer_token: string;
	query: string;
}) {
	return serverFetch<PaginationResponse<ITask>>({
		path: `/tasks/team?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function getTaskByIdRequest({
	tenantId,
	organizationId,
	bearer_token,
	relations = [
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
	],
	taskId
}: {
	tenantId: string;
	organizationId: string;
	bearer_token: string;
	taskId: string;
	relations?: string[];
}) {
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

	return serverFetch<ITask>({
		path: `/tasks/${taskId}?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteTaskRequest({
	tenantId,
	taskId,
	bearer_token
}: {
	tenantId: string;
	taskId: string;
	bearer_token: string;
}) {
	return serverFetch<DeleteResponse>({
		path: `/tasks/${taskId}?tenantId=${tenantId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskCreator({ userId, bearer_token }: { userId: string; bearer_token: string }) {
	return serverFetch<SingleDataResponse<IUser>>({
		path: `/user/${userId}`,
		method: 'GET',
		bearer_token
	});
}

export function createTaskRequest({ data, bearer_token }: { data: ICreateTask; bearer_token: string }) {
	return serverFetch({
		path: '/tasks',
		method: 'POST',
		body: data,
		bearer_token
	});
}

export function updateTaskRequest<ITask>({ data, id }: { data: ITask; id: string }, bearer_token: string) {
	return serverFetch({
		path: `/tasks/${id}`,
		method: 'PUT',
		body: data,
		bearer_token
	});
}

export function deleteEmployeeFromTasksRequest({
	tenantId,
	employeeId,
	organizationTeamId,
	bearer_token
}: {
	tenantId: string;
	employeeId: string;
	organizationTeamId: string;
	bearer_token: string;
}) {
	return serverFetch<DeleteResponse>({
		path: `/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getEmployeeTasksRequest({
	tenantId,
	employeeId,
	organizationTeamId,
	bearer_token
}: {
	tenantId: string;
	employeeId: string;
	organizationTeamId: string;
	bearer_token: string;
}) {
	return serverFetch<ITask[]>({
		path: `/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
