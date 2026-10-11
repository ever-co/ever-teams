'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
 * and the plan's new task order is saved; if saving fails the plan goes back to its last loaded
 * order. Moving a task to another plan is not saved, so a task dropped on another plan goes back
 * to its place. The saves of one plan run one after the other, in the order of the drops.
 *
 * @param plans - The plans as displayed, possibly with filtered tasks
 * @returns The plans to render and the `onDragEnd` handler for their `DragDropContext`
 */
export function useDailyPlanTaskOrder(plans: TDailyPlan[] | undefined) {
	const t = useTranslations();
	const { updateDailyPlan } = useUpdateDailyPlan();
	const [dragPlans, setDragPlans] = useState<TDailyPlan[]>(plans ?? []);
	const loadedPlans = useRef(plans);
	// Per plan id: its chain of saves and how many of them are not finished yet
	const saves = useRef(new Map<string, { queue: Promise<void>; pending: number }>());

	useEffect(() => {
		loadedPlans.current = plans;
		// A refetch that lands while an order is being saved can hold an older order: the refetch
		// that follows the last save brings the final one
		if (saves.current.size === 0) setDragPlans(plans ?? []);
	}, [plans]);

	const onDragEnd = useCallback(
		(result: DropResult) => {
			const { source, destination } = result;
			if (!destination || destination.droppableId !== source.droppableId || destination.index === source.index) {
				return;
			}

			handleDragAndDrop(result, dragPlans, setDragPlans);

			const plan = dragPlans.find((item) => item.id === source.droppableId);
			if (!plan?.id || plan.id === OUTSTANDING_NO_PLAN_ID) return;

			const planId = plan.id;
			// The API requires the plan owner's employeeId on every update
			const data = {
				taskOrder: movePlanTask(plan, source.index, destination.index),
				employeeId: plan.employeeId || undefined
			};
			const save = saves.current.get(planId) ?? { queue: Promise.resolve(), pending: 0 };
			save.pending += 1;
			saves.current.set(planId, save);

			// Chained, so an older order of the plan never reaches the API after a newer one
			save.queue = save.queue.then(async () => {
				try {
					await updateDailyPlan(data, planId);
				} catch (error) {
					logErrorInDev('Failed to save the task order of the plan', error);
					// A later drop still to be saved carries this move too: only the last one rolls back
					if (save.pending === 1) {
						const loaded = loadedPlans.current?.find((item) => item.id === planId) ?? plan;
						setDragPlans((current) => current.map((item) => (item.id === planId ? loaded : item)));
						toast.error(t('dailyPlan.TASK_ORDER_SAVE_FAILED'));
					}
				} finally {
					save.pending -= 1;
					if (save.pending === 0) saves.current.delete(planId);
				}
			});
		},
		[dragPlans, t, updateDailyPlan]
	);

	return { dragPlans, onDragEnd };
}
