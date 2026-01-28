import { taskService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Mutation hook for removing an employee from all assigned tasks.
 *
 * @description
 * Useful when unassigning an employee.
 * Automatically invalidates team tasks cache on success.
 *
 * @example
 * ```tsx
 * const { mutate: removeEmployee } = useDeleteEmployeeFromTasksMutation();
 *
 * const handleUnassigning = (employeeId: string) => {
 *   removeEmployee(employeeId);
 * };
 * ```
 *
 * @see {@link useInvalidateTeamTasks} - Cache invalidation utility
 *
 * @returns TanStack mutation object
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
