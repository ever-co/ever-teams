import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateTeamTasksData } from '../utils/use-invalidate-task-data';
import { taskService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';
import { useAtomValue, useSetAtom } from 'jotai';
import { activeTeamState, teamTasksState } from '@/core/stores';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TTask } from '@/core/types/schemas/task/task.schema';

export const useUpdateTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasksData();
	const queryClient = useQueryClient();

	const activeTeam = useAtomValue(activeTeamState);
	const setAllTasks = useSetAtom(teamTasksState);

	const updateTaskMutation = useMutation({
		mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: Partial<TTask> }) => {
			return await taskService.updateTask({ taskId, data: taskData });
		},
		onSuccess: (updatedTask, { taskId }) => {
			queryClient.setQueryData(queryKeys.tasks.byTeam(activeTeam?.id), (oldTasks: PaginationResponse<TTask>) => {
				if (!oldTasks) return oldTasks;

				const updatedItems = oldTasks?.items?.map((task) =>
					task.id === taskId ? { ...task, ...updatedTask } : task
				);

				// Sync the tasks store
				setAllTasks(updatedItems);

				return updatedItems ? { items: updatedItems, total: updatedItems.length } : oldTasks;
			});
			// Invalidate both tasks and daily plans to ensure UI synchronization
			invalidateTeamTasksData();
		}
	});

	return updateTaskMutation;
};
