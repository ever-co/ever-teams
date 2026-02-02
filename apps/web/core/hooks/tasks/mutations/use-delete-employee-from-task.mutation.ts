import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasksData } from '../utils/use-invalidate-task-data';

export const useDeleteEmployeeFromTaskMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasksData();

	const deleteEmployeeFromTasksMutation = useMutation({
		mutationFn: async (employeeId: string) => {
			return await taskService.deleteEmployeeFromTasks(employeeId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	return deleteEmployeeFromTasksMutation;
};
