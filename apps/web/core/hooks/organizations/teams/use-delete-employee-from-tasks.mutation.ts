import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Mutation hook for removing an employee from all assigned tasks.
 * Useful when unassigning or offboarding an employee.
 *
 * @returns TanStack mutation object with deleteEmployeeFromTasks mutationFn
 */
export const useDeleteEmployeeFromTasksMutation = () => {
	const invalidateTeamTasksData = useInvalidateTeamTasks();

	const mutation = useMutation({
		mutationFn: async (employeeId: string) => {
			return await taskService.deleteEmployeeFromTasks(employeeId);
		},
		onSuccess: invalidateTeamTasksData
	});

	return mutation;
};
