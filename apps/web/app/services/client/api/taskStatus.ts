import {
	CreateReponse,
	DeleteReponse,
	ITaskStatusCreate,
} from '@app/interfaces';
import api from '../axios';

export function createTaskStatusAPI(
	data: ITaskStatusCreate,
	tenantId?: string
) {
	return api.post<CreateReponse<ITaskStatusCreate>>('/task-statuses', data, {
		headers: {
			'Tenant-Id': tenantId,
		},
	});
}

export function deleteTaskStatusAPI(id: string, tenantId?: string) {
	return api.delete<DeleteReponse>(`/task-statuses/${id}`);
}

export function getTaskstatusList(tenantId: string, organizationId: string) {
	return api.get(
		`/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}`
	);
}
