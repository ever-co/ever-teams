import {
	ITaskStatusCreate,
	ITaskStatusItemList,
	PaginationResponse,
} from '@app/interfaces';
import api from '../axios';

export function createTaskStatusAPI(
	data: ITaskStatusCreate,
	tenantId?: string
) {
	return api.post<PaginationResponse<ITaskStatusItemList>>(
		'/task-statuses',
		data,
		{
			headers: {
				'Tenant-Id': tenantId,
			},
		}
	);
}

export function getTaskstatusList(tenantId: string, organizationId: string) {
	return api.get(
		`/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}`
	);
}
