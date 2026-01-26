import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { teamTasksState } from '@/core/stores';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useCurrentTeam } from './use-current-team';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Mutation hook for updating an existing task.
 * Performs optimistic cache update and syncs Jotai store on success.
 *
 * @returns TanStack mutation object with updateTask mutationFn
 */
export const useUpdateTaskMutation = () => {
	const queryClient = useQueryClient();
	const activeTeam = useCurrentTeam();
	const setAllTasks = useSetAtom(teamTasksState);

	const invalidateTeamTasksData = useInvalidateTeamTasks();

	const mutation = useMutation({
		mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: Partial<TTask> }) => {
			return await taskService.updateTask({ taskId, data: taskData });
		},
		/**
		 * Updates cache optimistically and syncs global state on success.
		 */
		onSuccess: (updatedTask, { taskId }) => {
			queryClient.setQueryData(queryKeys.tasks.byTeam(activeTeam?.id), (oldTasks: PaginationResponse<TTask>) => {
				if (!oldTasks) return oldTasks;

				const updatedItems = oldTasks?.items?.map((task) =>
					task.id === taskId ? { ...task, ...updatedTask } : task
				);

				// Sync Jotai store to keep global state consistent
				setAllTasks(updatedItems);

				return updatedItems ? { items: updatedItems, total: updatedItems.length } : oldTasks;
			});
			// Invalidate both tasks and daily plans to ensure UI synchronization
			invalidateTeamTasksData();
		}
	});

	return mutation;
};
