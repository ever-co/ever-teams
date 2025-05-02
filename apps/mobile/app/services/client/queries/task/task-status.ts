import { useQuery } from '@tanstack/react-query';
import { getTaskStatusesRequest } from '../../requests/task-status';

interface IGetTaskStatusesParams {
  authToken: string;
  tenantId: string;
  organizationId: string;
  activeTeamId: string;
}

/**
 * Fetches all task statuses from the API
 * @param params Authentication and filtering parameters
 * @returns Task status data from the API
 */
const fetchAllStatuses = async (params: IGetTaskStatusesParams) => {
  const { organizationId, tenantId, activeTeamId, authToken } = params;

  const { data } = await getTaskStatusesRequest(
    {
      tenantId,
      organizationId,
      activeTeamId
    },
    authToken
  );

  return data;
};

/**
 * Custom hook for fetching task statuses with React Query
 * @param params Parameters required for the fetch operation
 * @returns Query result containing task statuses data
 */
const useFetchAllStatuses = (params: IGetTaskStatusesParams) =>
  useQuery({
    queryKey: ['statuses'],
    queryFn: () => fetchAllStatuses(params),
    refetchInterval: 62000 // Auto-refresh approximately every minute
  });

export default useFetchAllStatuses;
