import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TASK_QUERY_GC_TIME_HOUR } from '../constants/TASK_QUERY_GC_TIME';
import { useLazyQueryState } from '../utils/use-lazy-query';

export const useGetTaskByIdQuery = (taskId: string) => {
	const query = useQuery({
		queryKey: queryKeys.tasks.detail(taskId),
		queryFn: async () => {
			if (!taskId) throw new Error('Task ID is required');
			return await taskService.getTaskById(taskId);
		},
		gcTime: TASK_QUERY_GC_TIME_HOUR
	});

	return query;
};

export const useGetTaskByIdLazyQuery = () => {
	// utility for lazy query
	const { setQueryKey, ...status } = useLazyQueryState<ReturnType<typeof queryKeys.tasks.detail>>();
	const queryClient = useQueryClient();

	const getTaskById = (taskId: string) => {
		setQueryKey(queryKeys.tasks.detail(taskId));
		return queryClient.fetchQuery({
			queryKey: queryKeys.tasks.detail(taskId),
			queryFn: async () => {
				setQueryKey(queryKeys.tasks.detail(taskId));
				if (!taskId) throw new Error('Task ID is required');
				return await taskService.getTaskById(taskId);
			}
		});
	};

	return { getTaskById, ...status };
};
