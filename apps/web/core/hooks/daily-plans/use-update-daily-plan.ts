'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { dailyPlanService, taskService } from '@/core/services/client/api';
import {
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import {
	TDailyPlanTasksUpdate,
	TRemoveTaskFromPlansRequest,
	TUpdateDailyPlan
} from '@/core/types/schemas/task/daily-plan.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamState } from '@/core/stores';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { queryKeys } from '@/core/query/keys';
import { useDailyPlanInvalidation } from './use-daily-plan-invalidation';

/**
 * Hook for updating daily plans.
 * Handles UPDATE operations including adding/removing tasks from plans.
 * Follows Single Responsibility Principle.
 *
 * @returns Object containing update mutations and loading states
 */
export function useUpdateDailyPlan() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const { invalidateDailyPlanData } = useDailyPlanInvalidation();

	const updateDailyPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TUpdateDailyPlan }) => {
			// The server requires `employeeId` in all update requests.
			// This value may represent either:
			// - the current owner of the plan, or
			// - a new owner, if the plan is being reassigned.
			let employeeId = data?.employeeId;
			if (!employeeId) {
				// If `employeeId` is not provided in the payload, we fetch the existing plan
				// to retrieve its current owner before sending the update request.
				const plan = await dailyPlanService.getPlanById(dailyPlanId);
				if (!plan.employeeId) throw new Error('Assign this plan to an employee before any update');
				employeeId = plan.employeeId;
			}
			const res = await dailyPlanService.updateDailyPlan({ ...data, employeeId }, dailyPlanId);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		}
	});

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

	const removeTaskFromPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeTaskFromPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		}
	});

	const removeTaskPlansMutation = useMutation({
		mutationFn: async ({ taskId, data }: { taskId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeManyTaskFromPlans({ taskId, data });
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		}
	});

	const updateDailyPlan = useCallback(
		async (data: TUpdateDailyPlan, planId: string) => {
			return await updateDailyPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[updateDailyPlanMutation]
	);

	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await addTaskToPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[addTaskToPlanMutation]
	);

	const removeTaskFromPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await removeTaskFromPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[removeTaskFromPlanMutation]
	);

	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlansRequest, taskId: string) => {
			return await removeTaskPlansMutation.mutateAsync({ data, taskId });
		},
		[removeTaskPlansMutation]
	);

	return {
		updateDailyPlan,
		updateDailyPlanLoading: updateDailyPlanMutation.isPending,
		addTaskToPlan,
		addTaskToPlanLoading: addTaskToPlanMutation.isPending,
		removeTaskFromPlan,
		removeTaskFromPlanLoading: removeTaskFromPlanMutation.isPending,
		removeManyTaskPlans,
		removeManyTaskFromPlanLoading: removeTaskPlansMutation.isPending,
		invalidateDailyPlanData
	};
}
