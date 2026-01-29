import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { queryKeys } from '@/core/query/keys';
import { dailyPlanService, taskService } from '@/core/services/client/api';
import { TDailyPlanTasksUpdate } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';

export const useAddTaskToPlanMutation = () => {
	const activeTeam = useCurrentTeam();
	const invalidateDailyPlanData = useInvalidateDailyPlanData();
	const queryClient = useQueryClient();

	const addTaskToPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TDailyPlanTasksUpdate }) => {
			const res = await dailyPlanService.addTaskToPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: async (_data, variables) => {
			try {
				const taskId = variables.data.taskId;
				// Use employeeId from the request data to ensure we assign the correct employee
				// when adding tasks to other employees' plans
				const requestEmployeeId = variables.data.employeeId;

				// Get the task from React Query cache
				const tasksData = queryClient.getQueryData<{ items: TTask[]; total: number }>(
					queryKeys.tasks.byTeam(activeTeam?.id)
				);

				const task = tasksData?.items?.find((t) => t.id === taskId);

				if (task && requestEmployeeId) {
					// Check if employee is already assigned to the task
					const isAlreadyAssigned = task.members?.some((member) => member.id === requestEmployeeId);

					if (!isAlreadyAssigned) {
						// Get employee object from activeTeam.members
						const employee = activeTeam?.members?.find((m) => m.employeeId === requestEmployeeId);
						if (employee && employee.employeeId) {
							// Add employee to task members (deduplicate by userId for idempotence)
							const existingMembers = task.members ?? [];
							const memberExists = existingMembers.some((m) => m.userId === employee.user?.id);

							if (!memberExists) {
								const updatedMembers = [...existingMembers, employee];
								// Update task via taskService (will trigger invalidation)
								await taskService.updateTask({
									taskId: task.id,
									data: { ...task, members: updatedMembers as any } // Type assertion needed due to Zod lazy schema
								});
								toast.success('Employee assigned to task');
							}
						}
					}
				}
			} catch (error) {
				// Log error but don't block the daily plan update
				toast.error('Failed to auto-assign employee to task', {
					description: getErrorMessage(error, 'Failed to auto-assign employee to task')
				});
				logErrorInDev('Failed to auto-assign employee to task:', error);
			}

			invalidateDailyPlanData();
		}
	});

	return addTaskToPlanMutation;
};
