import { useQuery } from 'react-query';
import { getTeamTasksRequest } from '../../requests/tasks';

interface IGetAllTasksParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
}
const fetchAllTasks = async (params: IGetAllTasksParams) => {
	const { data } = await getTeamTasksRequest({
		bearer_token: params.authToken,
		tenantId: params.tenantId,
		organizationId: params.organizationId
	});

	const tasks = data.items.filter((task) => {
		return task.teams.some((tm) => {
			return tm.id === params.activeTeamId;
		});
	});
	return tasks;
};

const useFetchAllTasks = (IGetAllTasksParams) =>
	useQuery(['tasks', IGetAllTasksParams], () => fetchAllTasks(IGetAllTasksParams), {
		refetchInterval: 5000,
		notifyOnChangeProps: ['data'] // Re-render only when data changes
	});
export default useFetchAllTasks;
