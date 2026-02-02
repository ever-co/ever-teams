import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasksData } from '../utils/use-invalidate-task-data';

/**
 * Removes an employee from all their assigned tasks.
 * Useful when removing a team member.
 *
 * @returns Mutation object with mutateAsync(employeeId)
 */
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
