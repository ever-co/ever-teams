import {
	CreateReponse,
	DeleteReponse,
	ITaskVersionCreate,
} from '@app/interfaces';
import api from '../axios';

export function createTaskVersionAPI(
	data: ITaskVersionCreate,
	tenantId?: string
) {
	return api.post<CreateReponse<ITaskVersionCreate>>('/task-versions', data, {
		headers: {
			'Tenant-Id': tenantId,
		},
	});
}

export function editTaskVersionAPI(
	id: string,
	data: ITaskVersionCreate,
	tenantId?: string
) {
	return api.put<CreateReponse<ITaskVersionCreate>>(
		`/task-versions/${id}`,
		data,
		{
			headers: {
				'Tenant-Id': tenantId,
			},
		}
	);
}

export function deleteTaskVersionAPI(id: string) {
	return api.delete<DeleteReponse>(`/task-versions/${id}`);
}

export function getTaskversionList(
	tenantId: string,
	organizationId: string,
	activeTeamId: string | null
) {
	return api.get(
		`/task-versions?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`
	);
}
