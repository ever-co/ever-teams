import { useQuery } from '@tanstack/react-query';
import { getTaskStatusesRequest } from '../../requests/task-status';

interface IGetTaskStatusesParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}
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

const useFetchAllStatuses = (IGetTaskStatusesParams) =>
	useQuery({
		queryKey: ['statuses'],
		queryFn: () => fetchAllStatuses(IGetTaskStatusesParams),
		refetchInterval: 62000
	});
export default useFetchAllStatuses;
