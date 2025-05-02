import { PaginationResponse } from '../../interfaces/IDataResponse';
import { ITaskStatusCreate, ITaskStatusItem } from '../../interfaces/ITaskStatus';
import { serverFetch } from '../fetch';

export function createStatusRequest(
	datas: ITaskStatusCreate,
	bearer_token: string,
	tenantId?: string
  ) {
	console.log('[createStatusRequest] Creating status with data:', {
	  dataKeys: Object.keys(datas),
	  hasTeamId: !!datas.organizationTeamId,
	  hasTenantId: !!tenantId,
	  hasToken: !!bearer_token
	});

	return serverFetch<ITaskStatusItem>({
	  path: '/task-statuses',
	  method: 'POST',
	  body: datas,
	  bearer_token,
	  tenantId
	}).then(response => {
	  console.log('[createStatusRequest] Create response:', {
		status: response.response.status,
		success: response.response.ok,
		id: response.data?.id,
		name: response.data?.name
	  });

	  if (!response.response.ok) {
		throw new Error(`Failed to create status: ${response.response.status}`);
	  }

	  return response;
	}).catch(error => {
	  console.error('[createStatusRequest] Create error:', error);
	  throw error;
	});
  }
export function updateTaskStatusRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskStatusCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskStatusItem>({
		path: `/task-statuses/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskStatusRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskStatusItem>({
		path: `/task-statuses/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskStatusesRequest(
	{ organizationId, tenantId, activeTeamId }: { tenantId: string; organizationId: string; activeTeamId: string },
	bearer_token: string
) {
	console.log('[getTaskStatusesRequest] Fetching statuses with:', {
		organizationId,
		tenantId,
		activeTeamId,
		hasToken: !!bearer_token
	});
	return serverFetch<PaginationResponse<ITaskStatusItem>>({
		path: `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`,
		method: 'GET',
		bearer_token
	}).then(response => {
		console.log('[getTaskStatusesRequest] Fetch response:', {
			status: response.response.status,
			total: response?.data?.total || 0,
			items: response?.data?.items?.length || 0
		});

		// If empty, log additional info
		if (!response?.data?.items?.length) {
			console.log('[getTaskStatusesRequest] No items in response');
		}

		return response;
	}).catch(error => {
		console.error('[getTaskStatusesRequest] Fetch error:', error);
		throw error;
	});
}
