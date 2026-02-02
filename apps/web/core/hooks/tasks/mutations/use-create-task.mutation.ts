import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasksData } from '../utils/use-invalidate-task-data';

/**
 * Creates a new task for the current active team.
 * Automatically invalidates team tasks cache on success.
 *
 * @returns Mutation object with mutateAsync({ title, issueType, status, ... })
 */
export const useCreateTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasksData();

	const createTaskMutation = useMutation({
		mutationFn: async (taskData: Parameters<typeof taskService.createTask>[0]) => {
			return await taskService.createTask(taskData);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	return createTaskMutation;
};
