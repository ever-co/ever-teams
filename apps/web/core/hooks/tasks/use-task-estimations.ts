import { queryKeys } from '@/core/query/keys';
import { taskEstimationsService } from '@/core/services/client/api/tasks/task-estimations.service';
import { TCreateTaskEstimation, TTask, TTaskEstimation } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useConditionalUpdateEffect } from '../common';
import { detailedTaskState } from '@/core/stores';
import { useAtom } from 'jotai';
export function useTaskEstimations() {
	const queryClient = useQueryClient();
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);

	const detailedTaskQueryData = queryClient.getQueryData(queryKeys.tasks.detail(detailedTask?.id)) as TTask;
	const isDetailedTaskQueryDataUpdated = JSON.stringify(detailedTask) !== JSON.stringify(detailedTaskQueryData);

	const addTaskEstimationMutation = useMutation({
		mutationFn: (data: TCreateTaskEstimation) => {
			return taskEstimationsService.addTaskEstimation(data);
		},
		onSuccess: (data) => {
			toast.success('Task estimation added successfully');
			queryClient.setQueryData(queryKeys.tasks.detail(data.taskId), (oldData: TTask) => {
				return {
					...oldData,
					estimations: [...(oldData.estimations || []), data]
				};
			});
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : null;

			toast.error('Error adding task estimation :', { description: errorMessage });
		}
	});

	const editTaskEstimationMutation = useMutation({
		mutationFn: (data: TTaskEstimation) => {
			return taskEstimationsService.editTaskEstimation(data);
		},
		onSuccess: (data) => {
			toast.success('Task estimation updated successfully');
			queryClient.setQueryData(queryKeys.tasks.detail(data.taskId), (oldData: TTask) => {
				return {
					...oldData,
					estimations: oldData.estimations?.map((estimation) =>
						estimation.id === data.id ? data : estimation
					)
				};
			});
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : null;

			toast.error('Error editing task estimation :', { description: errorMessage });
		}
	});

	const deleteTaskEstimationMutation = useMutation({
		mutationFn: ({ estimationId }: { estimationId: string; taskId: string }) => {
			return taskEstimationsService.deleteTaskEstimation(estimationId);
		},
		onSuccess: (data, { estimationId, taskId }) => {
			toast.success('Task estimation deleted successfully');
			queryClient.setQueryData(queryKeys.tasks.detail(taskId), (oldData: TTask) => {
				return {
					...oldData,
					estimations: oldData.estimations?.filter((estimation) => estimation.id !== estimationId)
				};
			});
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : null;

			toast.error('Error deleting task estimation :', { description: errorMessage });
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (detailedTaskQueryData) {
				setDetailedTask(detailedTaskQueryData);
			}
		},
		[detailedTaskQueryData],
		isDetailedTaskQueryDataUpdated
	);

	return {
		addTaskEstimationMutation,
		addTaskEstimationLoading: addTaskEstimationMutation.isPending,
		editTaskEstimationMutation,
		editTaskEstimationLoading: editTaskEstimationMutation.isPending,
		deleteTaskEstimationMutation,
		deleteTaskEstimationLoading: deleteTaskEstimationMutation.isPending
	};
}
