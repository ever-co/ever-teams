import { queryKeys } from '@/core/query/keys';
import { taskEstimationsService } from '@/core/services/client/api/tasks/task-estimations.service';
import { TCreateTaskEstimation, TTaskEstimations } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTaskEstimations() {
	const queryClient = useQueryClient();

	const addEstimationMutation = useMutation({
		mutationFn: (data: TCreateTaskEstimation) => {
			return taskEstimationsService.addEstimation(data);
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
		mutationFn: (data: TTaskEstimations) => {
			return taskEstimationsService.editEstimation(data);
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

	return {
		addEstimationMutation,
		addEstimationLoading: addEstimationMutation.isPending,
		editTaskEstimationMutation,
		editTaskEstimationLoading: editTaskEstimationMutation.isPending
	};
}
