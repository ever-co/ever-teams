/* eslint-disable camelcase */
import { ITaskLinkedIssue, ITaskLinkedIssueResponse, LinkedTaskIssue } from "../../interfaces/ITask"
import { serverFetch } from "../fetch"

export function createTaskLinkedIsssue(
	data: ITaskLinkedIssue,
	bearer_token: string,
	tenantId?: string,
) {
	return serverFetch<ITaskLinkedIssueResponse>({
		path: "/task-linked-issue",
		method: "POST",
		body: data,
		bearer_token,
		tenantId,
	})
}

export function updateTaskLinkedIssue(
	data: LinkedTaskIssue,
	bearer_token: string,
	tenantId?: string,
) {
	return serverFetch<LinkedTaskIssue>({
		path: `/task-linked-issue/${data.id}`,
		method: "PUT",
		body: data,
		bearer_token,
		tenantId,
	})
}
