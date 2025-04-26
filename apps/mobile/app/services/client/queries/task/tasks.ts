import { useQuery } from '@tanstack/react-query';
import { getTeamTasksRequest } from '../../requests/tasks';

interface IGetAllTasksParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}
const fetchAllTasks = async (params: IGetAllTasksParams) => {
	try {
		// Pass the teamId directly to the API call
		const { data } = await getTeamTasksRequest({
			bearer_token: params.authToken,
			tenantId: params.tenantId,
			organizationId: params.organizationId,
			activeTeamId: params.activeTeamId
		});

		// Server filtering should already be done, but we keep client filtering as a backup
		const tasks =
			data?.items?.filter((task) => {
				return !params.activeTeamId || task.teams.some((tm) => tm.id === params.activeTeamId);
			}) || [];

		return tasks;
	} catch (error) {
		console.error('Error fetching tasks:', error);
		return [];
	}
};

const useFetchAllTasks = (params: IGetAllTasksParams) =>
	useQuery({
		queryKey: ['tasks', params.tenantId, params.organizationId, params.activeTeamId],
		queryFn: () => fetchAllTasks(params),
		refetchInterval: 5000,
		notifyOnChangeProps: ['data'],
		enabled: !!params.activeTeamId // Only fetch when we have a team ID
	});

export default useFetchAllTasks;
