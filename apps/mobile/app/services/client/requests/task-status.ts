import { PaginationResponse } from '../../interfaces/IDataResponse';
import { ITaskStatusCreate, ITaskStatusItem } from '../../interfaces/ITaskStatus';
import { serverFetch } from '../fetch';

/**
 * Creates a new task status
 * @param data Task status data to create
 * @param bearer_token Authentication token
 * @param tenantId Tenant identifier
 * @returns API response with created task status
 */
export function createStatusRequest(
  data: ITaskStatusCreate,
  bearer_token: string,
  tenantId?: string
) {
  return serverFetch<ITaskStatusItem>({
    path: '/task-statuses',
    method: 'POST',
    body: data,
    bearer_token,
    tenantId
  }).then(response => {
    if (!response.response.ok) {
      throw new Error(`Failed to create status: ${response.response.status}`);
    }
    return response;
  });
}

/**
 * Updates an existing task status
 * @param params Update parameters including ID, data, auth token and tenant
 * @returns API response with updated task status
 */
export function updateTaskStatusRequest({
  id,
  datas,
  bearer_token,
  tenantId
}: {
  id: string;
  datas: ITaskStatusCreate;
  bearer_token: string;
  tenantId?: string;
}) {
  return serverFetch<ITaskStatusItem>({
    path: `/task-statuses/${id}`,
    method: 'PUT',
    body: datas,
    bearer_token,
    tenantId
  });
}

/**
 * Deletes a task status by ID
 * @param params Delete parameters including ID, auth token and tenant
 * @returns API response confirming deletion
 */
export function deleteTaskStatusRequest({
  id,
  bearer_token,
  tenantId
}: {
  id: string;
  bearer_token: string;
  tenantId?: string;
}) {
  return serverFetch<ITaskStatusItem>({
    path: `/task-statuses/${id}`,
    method: 'DELETE',
    bearer_token,
    tenantId
  });
}

/**
 * Fetches task statuses with filtering
 * @param params Filter parameters including organization, tenant and team
 * @param bearer_token Authentication token
 * @returns Paginated list of task statuses
 */
export function getTaskStatusesRequest(
  { organizationId, tenantId, activeTeamId }: {
    tenantId: string;
    organizationId: string;
    activeTeamId: string;
  },
  bearer_token: string
) {
  const queryParams = `tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`;

  return serverFetch<PaginationResponse<ITaskStatusItem>>({
    path: `/task-statuses?${queryParams}`,
    method: 'GET',
    bearer_token
  });
}
