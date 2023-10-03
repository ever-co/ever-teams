import {
	ITaskLinkedIssue,
	ITaskLinkedIssueResponse,
	LinkedTaskIssue
} from '@app/interfaces';
import api from '../axios';

export function createTaskLinkedIsssueAPI(data: ITaskLinkedIssue) {
	return api.post<ITaskLinkedIssueResponse>('/tasks/task-linked-issue', data);
}

export function updateTaskLinkedIssueAPI(data: LinkedTaskIssue) {
	return api.put<any>('/tasks/task-linked-issue', data);
}
