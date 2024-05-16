import { useQuery } from '@tanstack/react-query';
import { getTaskVersionListRequest } from '../../requests/task-version';

interface IGetTaskVersionsParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}
const fetchAllVersions = async (params: IGetTaskVersionsParams) => {
	const { organizationId, tenantId, activeTeamId, authToken } = params;
	const { data } = await getTaskVersionListRequest(
		{
			tenantId,
			organizationId,
			activeTeamId
		},
		authToken
	);
	return data;
};

const useFetchAllVersions = (IGetTaskVersionsParams) =>
	useQuery({
		queryKey: ['versions', IGetTaskVersionsParams],
		queryFn: () => fetchAllVersions(IGetTaskVersionsParams),
		refetchInterval: 62000
	});
export default useFetchAllVersions;
