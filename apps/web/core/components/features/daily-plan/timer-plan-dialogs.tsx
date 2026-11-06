'use client';

import { useCallback, useMemo } from 'react';
import moment from 'moment';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import {
	LazyAddTasksEstimationHoursModal,
	LazyEnforcePlanedTaskModal,
	LazySuggestDailyPlanModal
} from '@/core/components/optimized-components/daily-plan';
import type { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useTodayPlanEntry } from '@/core/hooks/daily-plans/use-today-plan-entry';
import { useTimerPlanStatus } from '@/core/hooks/timer';
import { todayKey } from '@/core/lib/utils/daily-plan-editor';
import { activeTeamRequiresPlanState, activeTeamTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type TimerPlanModals = ReturnType<typeof useStartStopTimerHandler>['modals'];

const NO_TASKS: TTask[] = [];

/**
 * The dialogs a timer start may open, the same for every timer. Accepting to plan the task opens today's plan at
 * once with the task joining it, so the person sees it arrive and starts from there.
 */
export function TimerPlanDialogs({ modals }: Readonly<{ modals: TimerPlanModals }>) {
	const t = useTranslations();
	const { hasPlan } = useTimerPlanStatus();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const requirePlan = useAtomValue(activeTeamRequiresPlanState);
	const putTaskInTodayPlan = useTodayPlanEntry();
	const isSuggestPlanMounted = useHasBeenOpen(modals.isSuggestDailyPlanModalOpen);
	const isEnforceSoftMounted = useHasBeenOpen(modals.isEnforceTaskSoftModalOpen);
	const isEstimationMounted = useHasBeenOpen(modals.isTasksEstimationHoursModalOpen);
	const isEnforceMounted = useHasBeenOpen(modals.isEnforceTaskModalOpen);
	const dayKey = todayKey();
	const today = useMemo(() => moment(dayKey).toDate(), [dayKey]);

	const { openAddTasksEstimationHoursModal, dismissEnforceTaskSoftModal, enforceTaskCloseModal } = modals;

	const openTodayPlanWithTask = useCallback(() => {
		openAddTasksEstimationHoursModal();
		if (!activeTeamTask) {
			return;
		}
		// The two requests already told the person what failed
		putTaskInTodayPlan(activeTeamTask, hasPlan).catch(() => undefined);
	}, [activeTeamTask, hasPlan, openAddTasksEstimationHoursModal, putTaskInTodayPlan]);

	const acceptSoftPrompt = useCallback(() => {
		dismissEnforceTaskSoftModal();
		openTodayPlanWithTask();
	}, [dismissEnforceTaskSoftModal, openTodayPlanWithTask]);

	const acceptRequiredPrompt = useCallback(() => {
		enforceTaskCloseModal();
		openTodayPlanWithTask();
	}, [enforceTaskCloseModal, openTodayPlanWithTask]);

	let planDay: (() => void) | undefined;
	if (activeTeamTask) {
		planDay = openTodayPlanWithTask;
	}
	const taskNumber = activeTeamTask?.taskNumber ?? '';
	const hasTodayPlan = Boolean(hasPlan);
	const hasActiveTask = Boolean(activeTeamTask);
	const canPromptForTask = hasTodayPlan && hasActiveTask;
	const showsSoftPrompt = isEnforceSoftMounted && canPromptForTask;
	const showsRequiredPrompt = isEnforceMounted && requirePlan && canPromptForTask;

	return (
		<>
			{isSuggestPlanMounted && (
				<LazySuggestDailyPlanModal
					isOpen={modals.isSuggestDailyPlanModalOpen}
					closeModal={modals.suggestDailyPlanCloseModal}
					onPlanDay={planDay}
				/>
			)}
			{showsSoftPrompt && (
				<LazyEnforcePlanedTaskModal
					content={t('dailyPlan.ADD_TASK_TO_TODAY_PLAN_QUESTION', { number: taskNumber })}
					closeModal={modals.enforceTaskSoftCloseModal}
					open={modals.isEnforceTaskSoftModalOpen}
					onConfirm={acceptSoftPrompt}
				/>
			)}
			{isEstimationMounted && (
				<LazyAddTasksEstimationHoursModal
					isOpen={modals.isTasksEstimationHoursModalOpen}
					closeModal={modals.tasksEstimationHoursCloseModal}
					plan={hasPlan}
					tasks={hasPlan?.tasks ?? NO_TASKS}
					selectedDate={today}
				/>
			)}
			{showsRequiredPrompt && (
				<LazyEnforcePlanedTaskModal
					content={t('dailyPlan.SUGGESTS_TO_ADD_TASK_TO_TODAY_PLAN')}
					closeModal={modals.enforceTaskCloseModal}
					open={modals.isEnforceTaskModalOpen}
					onConfirm={acceptRequiredPrompt}
				/>
			)}
		</>
	);
}
