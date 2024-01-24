import { ITaskLinkedIssue, ITaskLinkedIssueResponse, LinkedTaskIssue } from '@app/interfaces';
import { post, put } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';

export function createTaskLinkedIsssueAPI(data: ITaskLinkedIssue) {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/task-linked-issue' : '/tasks/task-linked-issue';
	return post<ITaskLinkedIssueResponse>(endpoint, data);
}

export function updateTaskLinkedIssueAPI(data: LinkedTaskIssue) {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/task-linked-issue/${data.id}` : '/tasks/task-linked-issue';
	return put<any>(endpoint, data);
}
