import { useQuery } from '@tanstack/react-query';
import { getTeamTasksRequest } from '../../requests/tasks';

interface IGetAllTasksParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	teamId: string;
}
const fetchAllTasks = async (params: IGetAllTasksParams) => {
	try {
        console.log('Fetching tasks with params:', params);
        const { data } = await getTeamTasksRequest({
            tenantId: params.tenantId,
            organizationId: params.organizationId,
            bearer_token: params.authToken,
            teamId: params.teamId
        });
        console.log('Raw API response:', data);

        if (!data || !data.items || !Array.isArray(data.items)) {
            console.log('No items found in response');
            return [];
          }
        // Server filtering should already be done, but we keep client filtering as a backup
        const tasks = data?.items?.filter((task) => {
            return !params.teamId || task.teams.some((tm) => tm.id === params.teamId);
        }) || [];

        // console.log(`Found ${data.items.length} tasks`);
        return data.items;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
};

const useFetchAllTasks = (params: IGetAllTasksParams) =>
    useQuery({
        queryKey: ['tasks', params.teamId], // Include team ID in the query key
        queryFn: () => fetchAllTasks(params),
        refetchInterval: 5000,
        notifyOnChangeProps: ['data'],
        enabled: !!params.teamId // Only fetch when we have a team ID
    });

export default useFetchAllTasks;
