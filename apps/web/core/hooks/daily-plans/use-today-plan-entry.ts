'use client';

import { useCallback } from 'react';
import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { plannedHoursForTask, todayKey } from '@/core/lib/utils/daily-plan-editor';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * Puts the timer's task in the signed-in member's plan of today: added to the plan when there is one, otherwise a
 * new plan planning the task's estimate. Both requests report their own failure.
 */
export function useTodayPlanEntry() {
	const { data: user } = useUserQuery();
	const { createDailyPlan } = useCreateDailyPlan();
	const { addTaskToPlan } = useUpdateDailyPlan();

	return useCallback(
		async (task: TTask, todayPlan: TDailyPlan | undefined) => {
			const employee = user?.employee;
			if (!employee) {
				return;
			}
			const planId = todayPlan?.id;
			const ownerId = todayPlan?.employeeId;
			if (planId && ownerId) {
				// Gauzy looks the plan up with its owner's id, as every other addition sends it
				const organizationId = todayPlan.organizationId ?? employee.organizationId;
				await addTaskToPlan({ taskId: task.id, employeeId: ownerId, organizationId }, planId);
				return;
			}
			await createDailyPlan({
				workTimePlanned: plannedHoursForTask(task),
				taskId: task.id,
				date: todayKey(),
				status: EDailyPlanStatus.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: employee.id,
				organizationId: employee.organizationId
			});
		},
		[addTaskToPlan, createDailyPlan, user?.employee, user?.tenantId]
	);
}
