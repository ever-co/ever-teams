import { useQuery } from '@tanstack/react-query';
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
	useQuery({
		queryKey: ['tasks'],
		queryFn: () => fetchAllTasksStats(IGetAllTasksParams),
		refetchInterval: 5000,
		refetchOnMount: true,
		notifyOnChangeProps: ['data']
	});
