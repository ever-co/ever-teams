import { PaginationResponse } from '../../interfaces/IDataResponse';
import { ITaskLabelCreate, ITaskLabelItem } from '../../interfaces/ITaskLabel';
import { serverFetch } from '../fetch';

export function createLabelRequest({
  datas,
  bearer_token,
  tenantId
}: {
  datas: ITaskLabelCreate;
  bearer_token: string;
  tenantId?: any;
}) {
  return serverFetch<ITaskLabelItem>({
    path: '/tags',
    method: 'POST',
    body: datas,
    bearer_token,
    tenantId
  });
}

export function updateTaskLabelsRequest({
  id,
  datas,
  bearer_token,
  tenantId
}: {
  id: string | any;
  datas: ITaskLabelCreate;
  bearer_token: string;
  tenantId?: any;
}) {
  return serverFetch<ITaskLabelItem>({
    path: `/tags/${id}`,
    method: 'PUT',
    body: datas,
    bearer_token,
    tenantId
  });
}

export function deleteTaskLabelRequest({
  id,
  bearer_token,
  tenantId
}: {
  id: string | any;
  bearer_token: string | any;
  tenantId?: any;
}) {
  return serverFetch<ITaskLabelItem>({
    path: `/tags/${id}`,
    method: 'DELETE',
    bearer_token,
    tenantId
  });
}

export function getAllTaskLabelsRequest(
  { organizationId, tenantId }: { tenantId: string; organizationId: string },
  bearer_token: string
) {
  // Get activeTeamId from store
  let activeTeamId;
  try {
    const { teamStore } = require('../../../models').useStores();
    activeTeamId = teamStore.activeTeamId;
  } catch (error) {
    activeTeamId = null;
  }

  // Use the web-style endpoint with organizationTeamId parameter
  const endpoint = `/tags/level?tenantId=${tenantId}&organizationId=${organizationId}${activeTeamId ? `&organizationTeamId=${activeTeamId}` : ''}`;

  return serverFetch<PaginationResponse<ITaskLabelItem>>({
    path: endpoint,
    method: 'GET',
    bearer_token,
    tenantId
  });
}
