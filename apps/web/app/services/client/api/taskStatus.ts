import {
	CreateReponse,
	DeleteReponse,
	ITaskStatusCreate
} from '@app/interfaces';
import api from '../axios';

export function createTaskStatusAPI(
	data: ITaskStatusCreate,
	tenantId?: string
) {
	return api.post<CreateReponse<ITaskStatusCreate>>('/task-statuses', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskStatusAPI(
	id: string,
	data: ITaskStatusCreate,
	tenantId?: string
) {
	return api.put<CreateReponse<ITaskStatusCreate>>(
		`/task-statuses/${id}`,
		data,
		{
			headers: {
				'Tenant-Id': tenantId
			}
		}
	);
}

export function deleteTaskStatusAPI(id: string) {
	return api.delete<DeleteReponse>(`/task-statuses/${id}`);
}

export function getTaskstatusList(
	tenantId: string,
	organizationId: string,
	activeTeamId: string | null
) {
	return api.get(
		`/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`
	);
}
