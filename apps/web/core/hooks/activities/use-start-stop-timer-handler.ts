import { useCallback, useMemo } from 'react';
import { useModal } from '../common/use-modal';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	TASKS_ESTIMATE_HOURS_MODAL_DATE,
	DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE
} from '@/core/constants/config/constants';
import { estimatedTotalTime } from '@/core/hooks/daily-plans/daily-plan-totals';
import { useTimerPlanStatus } from '../timer/use-timer-plan-status';
import { useAtomValue } from 'jotai';
import { timerStatusFetchingState } from '@/core/stores';
import { getTimerAction, hasSeenModalToday, type TimerPolicyState } from '@/core/lib/helpers/timer-policy';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export interface UseStartStopTimerHandlerParams {
	/** Start the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	startTimer: () => void | Promise<any>;
	/** Stop the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	stopTimer: () => void | Promise<any>;
}

/** Policy inputs read from today's plan. */
function getPlanPolicyInputs(plan: TDailyPlan | undefined, activeTaskId: string | undefined) {
	const tasksEstimationTimes = plan?.tasks ? estimatedTotalTime(plan.tasks).timesEstimated / 3600 : 0;

	return {
		hasPlan: !!plan,
		isActiveTaskPlanned: !!plan?.tasks?.some((task) => task.id === activeTaskId),
		areAllTasksEstimated: !!plan?.tasks?.every((el) => typeof el?.estimate === 'number' && el.estimate > 0),
		hasWorkedHours: !!(plan?.workTimePlanned && plan.workTimePlanned > 0),
		estimationTimeDifference: Math.abs(Number(plan?.workTimePlanned ?? 0) - tasksEstimationTimes)
	};
}

/**
 * Timer start/stop handler hook — "The Executor".
 *
 * Manages modal state and delegates the start/stop decision to a pure policy function.
 * The policy determines WHAT action to take; this hook executes it. Only a team that requires a plan gets plan
 * dialogs: the shell loads its members' plans at startup, so today's plan is known when Start is pressed.
 *
 * **Performance: "Pay only for what you use"**
 * - Uses `useTimerPlanStatus` (read-only atoms) instead of `useTimerActions` (full API layer)
 * - Reads `timerStatusFetchingState` directly from the shared Jotai atom
 * - Receives `startTimer`/`stopTimer` via dependency injection from the caller
 * - This avoids duplicating the entire `useTimerApi` instance that the caller already has
 *
 * @param params.startTimer — Injected from the caller's timer hook
 * @param params.stopTimer  — Injected from the caller's timer hook
 *
 * @see getTimerAction — Pure decision tree (core/lib/helpers/timer-policy.ts)
 * @see useTimerPlanStatus — Lightweight read-only plan state (core/hooks/timer)
 */
export function useStartStopTimerHandler({ startTimer, stopTimer }: UseStartStopTimerHandlerParams) {
	const {
		isOpen: isEnforceTaskModalOpen,
		closeModal: enforceTaskCloseModal,
		openModal: openEnforcePlannedTaskModal
	} = useModal();

	const {
		isOpen: isTasksEstimationHoursModalOpen,
		closeModal: tasksEstimationHoursCloseModal,
		openModal: openAddTasksEstimationHoursModal
	} = useModal();

	const {
		isOpen: isSuggestDailyPlanModalOpen,
		closeModal: suggestDailyPlanCloseModal,
		openModal: openSuggestDailyPlanModal
	} = useModal();

	const timerStatusFetching = useAtomValue(timerStatusFetchingState);
	const { hasPlan, canRunTimer, activeTeam, activeTeamTask, timerStatus } = useTimerPlanStatus();
	const actionDisabled = timerStatusFetching || !canRunTimer;

	const requirePlan = useMemo(() => !!activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const modalDispatch = useMemo(
		() =>
			({
				ENFORCE_PLAN: openEnforcePlannedTaskModal,
				SUGGEST_DAILY_PLAN: openSuggestDailyPlanModal,
				TASKS_ESTIMATION_HOURS: openAddTasksEstimationHoursModal
			}) as const,
		[openEnforcePlannedTaskModal, openSuggestDailyPlanModal, openAddTasksEstimationHoursModal]
	);

	const startStopTimerHandler = useCallback(() => {
		const currentDate = new Date().toISOString().split('T')[0];

		const policyState: TimerPolicyState = {
			isTimerStatusFetching: timerStatusFetching,
			canRunTimer,
			isTimerRunning: !!timerStatus?.running,
			requirePlan,
			...getPlanPolicyInputs(hasPlan, activeTeamTask?.id),
			hasSeenSuggestionModalToday: hasSeenModalToday(DAILY_PLAN_SUGGESTION_MODAL_DATE, currentDate),
			hasSeenEstimateHoursModalToday: hasSeenModalToday(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate),
			hasSeenPlanEstimateHoursModalToday: hasSeenModalToday(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE, currentDate)
		};

		const action = getTimerAction(policyState);

		switch (action.type) {
			case 'NOOP':
				return;
			case 'STOP_TIMER':
				stopTimer();
				return;
			case 'START_TIMER':
				// startTimer reports its own failure, this only keeps the rejection from going unhandled
				Promise.resolve(startTimer()).catch(() => undefined);
				return;
			case 'SHOW_MODAL':
				modalDispatch[action.modal]();
				return;
		}
	}, [
		activeTeamTask?.id,
		canRunTimer,
		hasPlan,
		modalDispatch,
		requirePlan,
		startTimer,
		stopTimer,
		timerStatus?.running,
		timerStatusFetching
	]);

	return {
		modals: {
			isEnforceTaskModalOpen,
			enforceTaskCloseModal,
			openEnforcePlannedTaskModal,
			isTasksEstimationHoursModalOpen,
			tasksEstimationHoursCloseModal,
			openAddTasksEstimationHoursModal,
			isSuggestDailyPlanModalOpen,
			suggestDailyPlanCloseModal,
			openSuggestDailyPlanModal
		},
		actionDisabled,
		startStopTimerHandler
	};
}
