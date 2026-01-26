import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Mutation hook for creating a new task.
 * Automatically invalidates tasks and daily plans cache on success.
 *
 * @returns TanStack mutation object with createTask mutationFn
 */
export const useCreateTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasks();

	return useMutation({
		mutationFn: async (taskData: Parameters<typeof taskService.createTask>[0]) => {
			return await taskService.createTask({
				...taskData,
				...(taskData?.description ? { description: `<p>${taskData?.description}</p>` } : {})
			});
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});
};
