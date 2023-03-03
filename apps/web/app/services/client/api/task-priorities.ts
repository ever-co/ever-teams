import {
	CreateReponse,
	DeleteReponse,
	ITaskPrioritiesCreate,
} from '@app/interfaces';
import api from '../axios';

export function createTaskPrioritiesAPI(
	data: ITaskPrioritiesCreate,
	tenantId?: string
) {
	return api.post<CreateReponse<ITaskPrioritiesCreate>>(
		'/task-priorities',
		data,
		{
			headers: {
				'Tenant-Id': tenantId,
			},
		}
	);
}

export function editTaskPrioritiesAPI(
	id: string,
	data: ITaskPrioritiesCreate,
	tenantId?: string
) {
	return api.put<CreateReponse<ITaskPrioritiesCreate>>(
		`/task-priorities/${id}`,
		data,
		{
			headers: {
				'Tenant-Id': tenantId,
			},
		}
	);
}

export function deleteTaskPrioritiesAPI(id: string) {
	return api.delete<DeleteReponse>(`/task-priorities/${id}`);
}

export function getTaskPrioritiesList(
	tenantId: string,
	organizationId: string,
	activeTeamId: string | null
) {
	return api.get(
		`/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}&activeTeamId=${activeTeamId}`
	);
}
