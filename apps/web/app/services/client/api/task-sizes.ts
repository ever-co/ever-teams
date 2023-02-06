import {
	CreateReponse,
	DeleteReponse,
	ITaskSizesCreate,
} from '@app/interfaces';
import api from '../axios';

export function createTaskSizesAPI(data: ITaskSizesCreate, tenantId?: string) {
	return api.post<CreateReponse<ITaskSizesCreate>>('/task-sizes', data, {
		headers: {
			'Tenant-Id': tenantId,
		},
	});
}

export function deleteTaskSizesAPI(id: string, tenantId?: string) {
	return api.delete<DeleteReponse>(`/task-sizes/${id}`);
}

export function getTaskSizesList(tenantId: string, organizationId: string) {
	return api.get(
		`/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}`
	);
}
