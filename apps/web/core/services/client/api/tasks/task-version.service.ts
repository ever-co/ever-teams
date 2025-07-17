import {
	ITaskVersion,
	ITaskVersionCreateRequest,
	ITaskVersionUpdateRequest
} from '@/core/types/interfaces/task/task-version';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';

class TaskVersionService extends APIService {
	// TODO: Implement createTaskVersion method
	createTaskVersion = async (data: ITaskVersionCreateRequest, tenantId?: string) => {
		console.error('Not implemented');
	};

	// TODO: Implement updateTaskVersion method
	updateTaskVersion = async (id: string, data: ITaskVersionUpdateRequest, tenantId?: string) => {
		console.error('Not implemented');
	};

	// TODO: Implement deleteTaskVersion method
	deleteTaskVersion = async (id: string) => {
		console.error('Not implemented');
	};

	getTaskVersions = async (tenantId: string, organizationId: string, organizationTeamId: string | null) => {
		const endpoint = `/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

		return this.get<PaginationResponse<ITaskVersion>>(endpoint, { tenantId });
	};
}

export const taskVersionService = new TaskVersionService(GAUZY_API_BASE_SERVER_URL.value);
