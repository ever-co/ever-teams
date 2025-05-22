import { ITaskVersion } from '@/core/types/interfaces/task/ITaskVersion';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/to-review/IDataResponse';

class TaskVersionService extends APIService {
	// TODO: Implement createTaskVersion method
	createTaskVersion = async () => {
		console.error('Not implemented');
	};

	// TODO: Implement editTaskVersion method
	editTaskVersion = async () => {
		console.error('Not implemented');
	};

	// TODO: Implement deleteTaskVersion method
	deleteTaskVersion = async () => {
		console.error('Not implemented');
	};

	getTaskVersionList = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskVersion>>(endpoint, { tenantId });
	};
}

export const taskVersionService = new TaskVersionService(GAUZY_API_BASE_SERVER_URL.value);
