import { queryKeys } from '@/core/query/keys';
import { taskEstimationsService } from '@/core/services/client/api/tasks/task-estimations.service';
import { TCreateTaskEstimation, TTaskEstimation } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTaskEstimations() {
	const queryClient = useQueryClient();

	const addTaskEstimationMutation = useMutation({
		mutationFn: (data: TCreateTaskEstimation) => {
			return taskEstimationsService.addTaskEstimation(data);
		},
		onSuccess: (data) => {
			toast.success('Task estimation added successfully');
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.taskId) });
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
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.taskId) });
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : null;

			toast.error('Error editing task estimation :', { description: errorMessage });
		}
	});

	const deleteEstimationMutation = useMutation({
		mutationFn: (estimationId: string) => {
			return taskEstimationsService.deleteTaskEstimation(estimationId);
		},
		onSuccess: (data) => {
			toast.success('Task estimation deleted successfully');
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.taskId) });
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : null;

			toast.error('Error deleting task estimation :', { description: errorMessage });
		}
	});

	return {
		addTaskEstimationMutation,
		addTaskEstimationLoading: addTaskEstimationMutation.isPending,
		editTaskEstimationMutation,
		editTaskEstimationLoading: editTaskEstimationMutation.isPending,
		deleteEstimationMutation,
		deleteEstimationLoading: deleteEstimationMutation.isPending
	};
}
