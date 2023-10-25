import { useQuery } from 'react-query';
import { tasksStatistics } from '../../api/timer/tasksStatistics';

interface IGetAllTasksParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	activeTaskId: string;
}
const fetchAllTasksStats = async (params: IGetAllTasksParams) => {
	const { authToken, tenantId, organizationId, activeTaskId } = params;
	const { data } = await tasksStatistics({
		tenantId,
		bearer_token: authToken,
		organizationId,
		activeTask: false,
		taskId: activeTaskId
	});

	return data;
};

export const useFetchAllTasksStats = (IGetAllTasksParams) =>
	useQuery(['tasks', IGetAllTasksParams], () => fetchAllTasksStats(IGetAllTasksParams), {
		refetchInterval: 5000,
		notifyOnChangeProps: ['data'] // Re-render only when data changes
	});
