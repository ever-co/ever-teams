import { useCallback, useMemo } from 'react';
import { useModal } from '../common/use-modal';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	TASKS_ESTIMATE_HOURS_MODAL_DATE,
	DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE
} from '@/core/constants/config/constants';
import { estimatedTotalTime } from '@/core/components/tasks/daily-plan';
import { useTimerPlanStatus } from '../timer';
import { useAtomValue } from 'jotai';
import { timerStatusFetchingState } from '@/core/stores';
import { getTimerAction, hasSeenModalToday, type TimerPolicyState } from '@/core/lib/helpers/timer-policy';

export interface UseStartStopTimerHandlerParams {
	/** Start the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	startTimer: () => void | Promise<any>;
	/** Stop the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	stopTimer: () => void | Promise<any>;
}

/**
 * Timer start/stop handler hook — "The Executor".
 *
 * Manages modal state and delegates the start/stop decision to a pure policy function.
 * The policy determines WHAT action to take; this hook executes it.
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
		isOpen: isEnforceTaskSoftModalOpen,
		closeModal: _enforceTaskSoftCloseModal,
		openModal: openEnforcePlannedTaskSoftModal
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

	const requirePlan = useMemo(() => !!activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const hasWorkedHours = useMemo(
		() => !!(hasPlan?.workTimePlanned && hasPlan.workTimePlanned > 0),
		[hasPlan?.workTimePlanned]
	);

	const areAllTasksEstimated = useMemo(
		() => !!hasPlan?.tasks?.every((el) => typeof el?.estimate === 'number' && el.estimate > 0),
		[hasPlan?.tasks]
	);

	const isActiveTaskPlanned = useMemo(
		() => !!hasPlan?.tasks?.some((task) => task.id === activeTeamTask?.id),
		[activeTeamTask?.id, hasPlan?.tasks]
	);

	const tasksEstimationTimes = useMemo(
		() => (hasPlan && hasPlan.tasks ? estimatedTotalTime(hasPlan.tasks).timesEstimated / 3600 : 0),
		[hasPlan]
	);

	const enforceTaskSoftCloseModal = useCallback(() => {
		_enforceTaskSoftCloseModal();
		openAddTasksEstimationHoursModal();
	}, [_enforceTaskSoftCloseModal, openAddTasksEstimationHoursModal]);

	const modalDispatch = useMemo(
		() =>
			({
				ENFORCE_PLAN: openEnforcePlannedTaskModal,
				ENFORCE_PLAN_SOFT: openEnforcePlannedTaskSoftModal,
				SUGGEST_DAILY_PLAN: openSuggestDailyPlanModal,
				TASKS_ESTIMATION_HOURS: openAddTasksEstimationHoursModal
			}) as const,
		[
			openEnforcePlannedTaskModal,
			openEnforcePlannedTaskSoftModal,
			openSuggestDailyPlanModal,
			openAddTasksEstimationHoursModal
		]
	);

	const startStopTimerHandler = useCallback(() => {
		const currentDate = new Date().toISOString().split('T')[0];

		const policyState: TimerPolicyState = {
			isTimerStatusFetching: timerStatusFetching,
			canRunTimer,
			isTimerRunning: !!timerStatus?.running,
			requirePlan,
			hasPlan: !!hasPlan,
			isActiveTaskPlanned,
			areAllTasksEstimated,
			hasWorkedHours,
			estimationTimeDifference: Math.abs(Number(hasPlan?.workTimePlanned ?? 0) - tasksEstimationTimes),
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
				startTimer();
				return;
			case 'SHOW_MODAL':
				modalDispatch[action.modal]();
				return;
		}
	}, [
		areAllTasksEstimated,
		canRunTimer,
		hasPlan,
		hasWorkedHours,
		isActiveTaskPlanned,
		modalDispatch,
		requirePlan,
		startTimer,
		stopTimer,
		tasksEstimationTimes,
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
			openSuggestDailyPlanModal,
			isEnforceTaskSoftModalOpen,
			enforceTaskSoftCloseModal,
			openEnforcePlannedTaskSoftModal
		},
		startStopTimerHandler
	};
}
