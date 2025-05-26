import { ITaskLinkedIssue } from '@/core/types/interfaces/task/ITaskLinkedIssue';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';

class TaskLinkedIssueService extends APIService {
	createTaskLinkedIssue = async (data: Omit<ITaskLinkedIssue, 'id'>) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/task-linked-issue' : '/tasks/task-linked-issue';
		return this.post<ITaskLinkedIssue>(endpoint, data);
	};

	updateTaskLinkedIssue = async (data: ITaskLinkedIssue) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/task-linked-issue/${data.id}` : '/tasks/task-linked-issue';
		return this.put<ITaskLinkedIssue>(endpoint, data);
	};
}

export const taskLinkedIssueService = new TaskLinkedIssueService(GAUZY_API_BASE_SERVER_URL.value);
