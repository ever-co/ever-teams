import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Hook providing a mutation to delete a task by its ID.
 * Automatically invalidates team tasks and daily plans queries on success.
 *
 * @returns TanStack mutation object for task deletion
 *
 * @example
 * const { mutate: deleteTask, isPending } = useDeleteTaskMutation();
 * deleteTask('task-123');
 */
export const useDeleteTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasks();

	return useMutation({
		mutationFn: (taskId: string) => taskService.deleteTask(taskId),
		onSuccess: invalidateTeamTasksData
	});
};
