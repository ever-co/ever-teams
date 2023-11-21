import { CreateResponse, DeleteResponse, ITaskSizesCreate } from '@app/interfaces';
import api, { apiDirect } from '../axios';
import { getAccessTokenCookie } from '@app/helpers';

export function createTaskSizesAPI(data: ITaskSizesCreate, tenantId?: string) {
	return api.post<CreateResponse<ITaskSizesCreate>>('/task-sizes', data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editTaskSizesAPI(id: string, data: ITaskSizesCreate, tenantId?: string) {
	return api.put<CreateResponse<ITaskSizesCreate>>(`/task-sizes/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function deleteTaskSizesAPI(id: string) {
	return api.delete<DeleteResponse>(`/task-sizes/${id}`);
}

export async function getTaskSizesList(tenantId: string, organizationId: string, activeTeamId: string | null) {
	const endpoint = `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;

	// API call direct to Backend Server
	if (process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL) {
		const token = getAccessTokenCookie();
		const data = await apiDirect.get(endpoint, {
			headers: {
				authorization: `Bearer ${token}`
			}
		});
		return {
			data: data,
			response: {}
		};
	}

	// API call via Proxy Nextjs /api routes
	return api.get(endpoint);
}
