'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { DEFAULT_PLANNED_TASK_ID } from '@/core/constants/config/constants';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-team-tasks-state';
import { useTimerActions } from '@/core/hooks/timer';
import { activeTeamTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** What to do when the timer starts on a plan that does not hold the active task. */
export type ActiveTaskSwitchChoice = 'usePlannedTask' | 'addActiveTask' | 'addActiveTaskAndUsePlannedTask';

export const ACTIVE_TASK_SWITCH_CHOICES: ActiveTaskSwitchChoice[] = [
	'usePlannedTask',
	'addActiveTask',
	'addActiveTaskAndUsePlannedTask'
];

function addsActiveTask(choice: ActiveTaskSwitchChoice) {
	return choice !== 'usePlannedTask';
}

function usesPlannedTask(choice: ActiveTaskSwitchChoice) {
	return choice !== 'addActiveTask';
}

/**
 * The three answers of the "change active task" step. The active task always joins the signed-in person's own plan
 * for today, the plan the timer reads.
 */
export function useActiveTaskSwitch(plannedTask: TTask | null) {
	const { startTimer, hasPlan: todayPlan } = useTimerActions();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { setActiveTask } = useSetActiveTask();
	const { addTaskToPlan } = useUpdateDailyPlan();

	const addActiveTaskToToday = useCallback(async () => {
		const todayPlanId = todayPlan?.id;
		const activeTaskId = activeTeamTask?.id;
		if (!todayPlanId || !activeTaskId) {
			return;
		}
		await addTaskToPlan({ employeeId: todayPlan?.employeeId ?? undefined, taskId: activeTaskId }, todayPlanId);
	}, [activeTeamTask?.id, addTaskToPlan, todayPlan?.employeeId, todayPlan?.id]);

	const applyChoice = useCallback(
		async (choice: ActiveTaskSwitchChoice) => {
			try {
				if (addsActiveTask(choice)) {
					await addActiveTaskToToday();
				}
				const remembersActiveTask = choice === 'addActiveTask';
				if (remembersActiveTask && activeTeamTask) {
					window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, activeTeamTask.id);
				}
				const switchesTask = usesPlannedTask(choice) && Boolean(plannedTask);
				if (switchesTask) {
					setActiveTask(plannedTask);
				}
			} catch (error) {
				console.error(error);
			}
		},
		[activeTeamTask, addActiveTaskToToday, plannedTask, setActiveTask]
	);

	const start = useCallback(() => {
		// startTimer reports its own failure; this only keeps the rejection from going unhandled
		startTimer()?.catch(() => undefined);
	}, [startTimer]);

	return { activeTask: activeTeamTask, applyChoice, start };
}
