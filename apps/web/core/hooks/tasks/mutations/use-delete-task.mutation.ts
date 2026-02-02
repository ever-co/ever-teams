import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasksData } from '../utils/use-invalidate-task-data';

/**
 * Deletes a task by ID.
 * Invalidates team tasks cache on success.
 *
 * @returns Mutation object with mutateAsync(taskId)
 */
export const useDeleteTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasksData();

	const deleteTaskMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await taskService.deleteTask(taskId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	return deleteTaskMutation;
};
