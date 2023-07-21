import { ITaskLinkedIssue, ITaskLinkedIssueResponse } from '@app/interfaces';
import api from '../axios';

export function createTaskLinkedIsssueAPI(data: ITaskLinkedIssue) {
	return api.post<ITaskLinkedIssueResponse>('/tasks/task-linked-issue', data);
}
