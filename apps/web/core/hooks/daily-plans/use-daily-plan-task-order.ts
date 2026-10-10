'use client';

import { useCallback, useEffect, useState } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { handleDragAndDrop } from '@/core/lib/helpers/drag-and-drop';
import { movePlanTask } from '@/core/lib/helpers/daily-plan-task-order';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { OUTSTANDING_NO_PLAN_ID } from './use-daily-plan-calculations';
import { useUpdateDailyPlan } from './use-update-daily-plan';

/**
 * Drag and drop state for a list of plans. A task moved inside its plan is shown in place at once,
 * and the plan's new task order is saved; if saving fails the previous order comes back. A task
 * dropped on another plan only moves on screen, as before.
 *
 * @param plans - The plans as displayed, possibly with filtered tasks
 * @returns The plans to render and the `onDragEnd` handler for their `DragDropContext`
 */
export function useDailyPlanTaskOrder(plans: TDailyPlan[] | undefined) {
	const t = useTranslations();
	const { updateDailyPlan } = useUpdateDailyPlan();
	const [dragPlans, setDragPlans] = useState<TDailyPlan[]>(plans ?? []);

	useEffect(() => {
		setDragPlans(plans ?? []);
	}, [plans]);

	const onDragEnd = useCallback(
		async (result: DropResult) => {
			const previousPlans = dragPlans;
			handleDragAndDrop(result, previousPlans, setDragPlans);

			const { source, destination } = result;
			if (!destination || destination.droppableId !== source.droppableId || destination.index === source.index) {
				return;
			}

			const plan = previousPlans.find((item) => item.id === source.droppableId);
			if (!plan?.id || plan.id === OUTSTANDING_NO_PLAN_ID) return;

			try {
				// The API requires the plan owner's employeeId on every update
				await updateDailyPlan(
					{
						taskOrder: movePlanTask(plan, source.index, destination.index),
						employeeId: plan.employeeId || undefined
					},
					plan.id
				);
			} catch (error) {
				setDragPlans(previousPlans);
				toast.error(t('dailyPlan.TASK_ORDER_SAVE_FAILED'));
				logErrorInDev('Failed to save the task order of the plan', error);
			}
		},
		[dragPlans, t, updateDailyPlan]
	);

	return { dragPlans, onDragEnd };
}
