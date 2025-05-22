import { ITaskLinkedIssue, ITaskLinkedIssueResponse, ITaskLinkedIssue } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../fetch';

export function createTaskLinkedIssue(data: ITaskLinkedIssue, bearer_token: string, tenantId?: string) {
	return serverFetch<ITaskLinkedIssueResponse>({
		path: '/task-linked-issue',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId
	});
}

export function updateTaskLinkedIssue(data: ITaskLinkedIssue, bearer_token: string, tenantId?: string) {
	return serverFetch<ITaskLinkedIssue>({
		path: `/task-linked-issue/${data.id}`,
		method: 'PUT',
		body: data,
		bearer_token,
		tenantId
	});
}
