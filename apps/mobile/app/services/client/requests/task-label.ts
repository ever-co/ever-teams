import { PaginationResponse } from '../../interfaces/IDataResponse';
import { ITaskLabelCreate, ITaskLabelItem } from '../../interfaces/ITaskLabel';
import { serverFetch } from '../fetch';
import { useStores } from '../../../models';

/**
 * Request parameters interface for consistent typing
 */
interface RequestParams {
  bearer_token: string;
  tenantId?: string;
}

/**
 * Creates a new task label
 * @param params - The request parameters
 * @returns Promise with the created label
 */
export function createLabelRequest({
  datas,
  bearer_token,
  tenantId
}: RequestParams & {
  datas: ITaskLabelCreate;
}) {
  return serverFetch<ITaskLabelItem>({
    path: '/tags',
    method: 'POST',
    body: datas,
    bearer_token,
    tenantId
  });
}

/**
 * Updates an existing task label
 * @param params - The request parameters including label ID and data
 * @returns Promise with the updated label
 */
export function updateTaskLabelsRequest({
  id,
  datas,
  bearer_token,
  tenantId
}: RequestParams & {
  id: string;
  datas: ITaskLabelCreate;
}) {
  if (!id) {
    return Promise.reject(new Error('Label ID is required for update'));
  }

  return serverFetch<ITaskLabelItem>({
    path: `/tags/${id}`,
    method: 'PUT',
    body: datas,
    bearer_token,
    tenantId
  });
}

/**
 * Deletes a task label
 * @param params - The request parameters including label ID
 * @returns Promise with the deletion result
 */
export function deleteTaskLabelRequest({
  id,
  bearer_token,
  tenantId
}: RequestParams & {
  id: string;
}) {
  if (!id) {
    return Promise.reject(new Error('Label ID is required for deletion'));
  }

  return serverFetch<ITaskLabelItem>({
    path: `/tags/${id}`,
    method: 'DELETE',
    bearer_token,
    tenantId
  });
}

/**
 * Parameters for fetching task labels
 */
interface FetchLabelsParams {
  organizationId: string;
  tenantId: string;
  organizationTeamId?: string;
}

/**
 * Gets the list of task labels using the web-compatible endpoint
 * @param params - The request parameters
 * @param bearer_token - Authentication token
 * @returns Promise with paginated list of labels
 */
export function getAllTaskLabelsRequest(
  { organizationId, tenantId }: FetchLabelsParams,
  bearer_token: string
) {
  if (!organizationId || !tenantId) {
    return Promise.reject(new Error('Organization ID and Tenant ID are required'));
  }

  // Get activeTeamId from store
  let activeTeamId: string | null = null;
  try {
    // Use non-require approach to avoid potential circular dependencies
    const stores = useStores();
    activeTeamId = stores.teamStore.activeTeamId;
  } catch (error) {
    // Silent fail - will proceed without team ID
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    tenantId,
    organizationId
  });

  // Only add team ID if it exists
  if (activeTeamId) {
    queryParams.append('organizationTeamId', activeTeamId);
  }

  // Use the web-style endpoint with organizationTeamId parameter
  const endpoint = `/tags/level?${queryParams.toString()}`;

  return serverFetch<PaginationResponse<ITaskLabelItem>>({
    path: endpoint,
    method: 'GET',
    bearer_token,
    tenantId
  });
}

/**
 * Higher-level function that returns appropriate labels based on context
 * This can be used if you need custom filtering or business logic
 */
export async function getFilteredLabels(
  params: FetchLabelsParams,
  bearer_token: string,
  options?: { filterByTeam?: boolean }
): Promise<ITaskLabelItem[]> {
  try {
    const response = await getAllTaskLabelsRequest(params, bearer_token);

    if (!response?.data?.items) {
      return [];
    }

    // Apply any additional filtering if needed
    let items = response.data.items;

    // Example: Filter by active status
    if (options?.filterByTeam && params.organizationTeamId) {
      items = items.filter(item => item.organizationId === params.organizationTeamId);
    }

    return items;
  } catch (error) {
    console.error('Error fetching filtered labels:', error);
    return [];
  }
}
