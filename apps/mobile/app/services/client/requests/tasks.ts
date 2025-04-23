/* eslint-disable camelcase */
import { DeleteResponse, PaginationResponse, CreateResponse } from "../../interfaces/IDataResponse"
import { ICreateTask, ITeamTask } from "../../interfaces/ITask"
import { serverFetch } from "../fetch"

export function getTeamTasksRequest({
	tenantId,
	organizationId,
	bearer_token,
	activeTeamId, // Added parameter
	relations = [
		"tags",
		"teams",
		"members",
		"members.user",
		"creator",
		"linkedIssues",
		"linkedIssues.taskTo",
		"linkedIssues.taskFrom",
		"parent",
		"children"
	],
}: {
	tenantId: string
	organizationId: string
	bearer_token: string
	activeTeamId?: string // Made optional but included in type
	relations?: string[]
}) {
	const params = {
		"where[organizationId]": organizationId,
		"where[tenantId]": tenantId,
		"join[alias]": "task",
		"join[leftJoinAndSelect][members]": "task.members",
		"join[leftJoinAndSelect][user]": "members.user",
		...(activeTeamId ? { "where[teams][0]": activeTeamId } : {}) // Added team filter
	} as { [x: string]: string }

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl
	})

	const query = new URLSearchParams(params)
	console.log("Tasks API request:", `/tasks/team?${query.toString()}`);

	return serverFetch<PaginationResponse<ITeamTask>>({
		path: `/tasks/team?${query.toString()}`,
		method: "GET",
		bearer_token,
		tenantId,
	})
}

export function getTaskByIdRequest({
	tenantId,
	organizationId,
	bearer_token,
	relations = [
		"tags",
		"teams",
		"members",
		"members.user",
		"creator",
		"linkedIssues",
		"linkedIssues.taskTo",
		"linkedIssues.taskFrom",
		"parent",
		"children",
	],
	taskId,
}: {
	tenantId: string
	organizationId: string
	bearer_token: string
	taskId: string
	relations?: string[]
}) {
	const obj = {
		"where[organizationId]": organizationId,
		"where[tenantId]": tenantId,
		"join[alias]": "task",
		"join[leftJoinAndSelect][members]": "task.members",
		"join[leftJoinAndSelect][user]": "members.user",
		includeRootEpic: "true",
	} as Record<string, string>

	relations.forEach((rl, i) => {
		obj[`relations[${i}]`] = rl
	})

	const query = new URLSearchParams(obj)

	return serverFetch<CreateResponse<ITeamTask>>({
		path: `/tasks/${taskId}?${query.toString()}`,
		method: "GET",
		bearer_token,
		tenantId,
	})
}

export function deleteTaskRequest({
	tenantId,
	taskId,
	bearer_token,
}: {
	tenantId: string
	taskId: string
	bearer_token: string
}) {
	return serverFetch<DeleteResponse>({
		path: `/tasks/${taskId}?tenantId=${tenantId}`,
		method: "DELETE",
		bearer_token,
		tenantId,
	})
}

export function createTaskRequest({
	data,
	bearer_token,
}: {
	data: ICreateTask
	bearer_token: string
}) {
	return serverFetch<ITeamTask>({
		path: "/tasks",
		method: "POST",
		body: data,
		bearer_token,
	})
}

export function updateTaskRequest<ITeamTask>(
	{ data, id }: { data: ITeamTask; id: string },
	bearer_token: string,
) {
	return serverFetch({
		path: `/tasks/${id}`,
		method: "PUT",
		body: data,
		bearer_token,
	})
}

export function deleteEmployeeFromTasksRequest({
	tenantId,
	employeeId,
	organizationTeamId,
	bearer_token,
}: {
	tenantId: string
	employeeId: string
	organizationTeamId: string
	bearer_token: string
}) {
	return serverFetch<DeleteResponse>({
		path: `/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`,
		method: "DELETE",
		bearer_token,
		tenantId,
	})
}

export function getEmployeeTasksRequest({
	tenantId,
	employeeId,
	organizationTeamId,
	bearer_token,
}: {
	tenantId: string
	employeeId: string
	organizationTeamId: string
	bearer_token: string
}) {
	return serverFetch<ITeamTask[]>({
		path: `/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`,
		method: "GET",
		bearer_token,
		tenantId,
	})
}
