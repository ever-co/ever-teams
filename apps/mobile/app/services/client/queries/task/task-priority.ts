import { useQuery } from '@tanstack/react-query';
import { getTaskAllPrioritiesRequest } from '../../requests/task-priority';

interface IGetTaskPrioritiesParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}
const fetchAllPriorities = async (params: IGetTaskPrioritiesParams) => {
	const { organizationId, tenantId, activeTeamId, authToken } = params;
	const { data } = await getTaskAllPrioritiesRequest(
		{
			tenantId,
			organizationId,
			activeTeamId
		},
		authToken
	);
	return data;
};

const useFetchAllPriorities = (IGetTaskPrioritiesParams) =>
	useQuery({
		queryKey: ['priorities'],
		queryFn: () => fetchAllPriorities(IGetTaskPrioritiesParams),
		refetchInterval: 62000
	});
export default useFetchAllPriorities;
