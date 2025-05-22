import { ITaskLinkedIssue, ITaskLinkedIssueResponse, LinkedTaskIssue } from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TaskLinkedIssueService extends APIService {
	createTaskLinkedIssue = async (data: ITaskLinkedIssue) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/task-linked-issue' : '/tasks/task-linked-issue';
		return this.post<ITaskLinkedIssueResponse>(endpoint, data);
	};

	updateTaskLinkedIssue = async (data: LinkedTaskIssue) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/task-linked-issue/${data.id}` : '/tasks/task-linked-issue';
		return this.put<any>(endpoint, data);
	};
}

export const taskLinkedIssueService = new TaskLinkedIssueService(GAUZY_API_BASE_SERVER_URL.value);
