import { taskEstimationsService } from '@/core/services/client/api/tasks/task-estimations.service';
import { TTaskEstimations } from '@/core/types/schemas/task/task.schema';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTaskEstimations() {
	const addEstimationMutation = useMutation({
		mutationFn: (data: TTaskEstimations) => {
			return taskEstimationsService.addEstimation(data);
		},
		onSuccess: () => {
			toast.success('Task estimation added successfully');
		},
		onError: (error) => {
			toast.error('Error adding task estimation');
		}
	});

	const editTaskEstimationMutation = useMutation({
		mutationFn: (data: TTaskEstimations) => {
			return taskEstimationsService.editEstimation(data);
		},
		onSuccess: () => {
			toast.success('Task estimation updated successfully');
		},
		onError: (error) => {
			console.error('Error editing task estimation:', error);
		}
	});

	return {
		addEstimationMutation,
		editTaskEstimationMutation
	};
}
