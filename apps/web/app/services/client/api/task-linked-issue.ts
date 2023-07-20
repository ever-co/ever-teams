import { ITaskLinkedIssue } from '@app/interfaces';
import api from '../axios';

export function createTaskLinkedIsssueAPI(data: ITaskLinkedIssue) {
	return api.post<any>('/tasks/task-linked-issue', data);
}
