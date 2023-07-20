import { ITaskLinkedIssue } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function createTaskLinkedIsssue(
	data: ITaskLinkedIssue,
	bearer_token: string,
	tenantId?: string
) {
	return serverFetch<any>({
		path: '/task-linked-issue',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId,
	});
}
