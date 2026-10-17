import { useCallback, useMemo, useRef } from 'react';
import { useModal } from '../common/use-modal';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	TASKS_ESTIMATE_HOURS_MODAL_DATE,
	DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE
} from '@/core/constants/config/constants';
import { estimatedTotalTime } from '@/core/hooks/daily-plans/daily-plan-totals';
import { useTimerPlanStatus } from '../timer';
import { useAtomValue } from 'jotai';
import { timerStatusFetchingState } from '@/core/stores';
import { getTimerAction, hasSeenModalToday, type TimerPolicyState } from '@/core/lib/helpers/timer-policy';
import { findTimerPlans } from '@/core/lib/helpers/daily-plan-day';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export interface UseStartStopTimerHandlerParams {
	/** Start the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	startTimer: () => void | Promise<any>;
	/** Stop the timer — injected from the caller's existing timer hook (useTimerView, useTimer, etc.) */
	stopTimer: () => void | Promise<any>;
}

/** Policy inputs read from today's plan, so the cached plan and a plan fetched on click give the same state. */
function getPlanPolicyInputs(plan: TDailyPlan | undefined, activeTaskId: string | undefined) {
	const tasksEstimationTimes = plan && plan.tasks ? estimatedTotalTime(plan.tasks).timesEstimated / 3600 : 0;

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
	const { hasPlan, canRunTimer, activeTeam, activeTeamTask, timerStatus, ensureMyDailyPlans, hasCachedMyDailyPlans } =
		useTimerPlanStatus();
	const actionDisabled = timerStatusFetching || !canRunTimer;
	const planRequestPendingRef = useRef(false);

	const requirePlan = useMemo(() => !!activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const enforceTaskSoftCloseModal = useCallback(() => {
		_enforceTaskSoftCloseModal();
		if (requirePlan || !ensureMyDailyPlans) {
			openAddTasksEstimationHoursModal();
			return;
		}
		// Yes may have just added the task, and nothing refetches the plans on its own in these teams
		void ensureMyDailyPlans().finally(openAddTasksEstimationHoursModal);
	}, [_enforceTaskSoftCloseModal, ensureMyDailyPlans, openAddTasksEstimationHoursModal, requirePlan]);

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

	const runTimerAction = useCallback(
		(plan: TDailyPlan | undefined) => {
			const currentDate = new Date().toISOString().split('T')[0];

			const policyState: TimerPolicyState = {
				isTimerStatusFetching: timerStatusFetching,
				canRunTimer,
				isTimerRunning: !!timerStatus?.running,
				requirePlan,
				...getPlanPolicyInputs(plan, activeTeamTask?.id),
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
		},
		[
			activeTeamTask?.id,
			canRunTimer,
			modalDispatch,
			requirePlan,
			startTimer,
			stopTimer,
			timerStatus?.running,
			timerStatusFetching
		]
	);

	const startStopTimerHandler = useCallback(() => {
		// Teams that do not require a plan never load the personal plans at startup, so a start may have to read them
		if (actionDisabled || timerStatus?.running || requirePlan || !ensureMyDailyPlans) {
			runTimerAction(hasPlan);
			return;
		}
		// A second click while the plans load would start the timer twice
		if (planRequestPendingRef.current) return;
		const currentDate = new Date().toISOString().split('T')[0];
		// Without a plan requirement, once both prompts were seen today the policy starts whatever the plan holds
		if (
			hasSeenModalToday(DAILY_PLAN_SUGGESTION_MODAL_DATE, currentDate) &&
			hasSeenModalToday(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate)
		) {
			runTimerAction(hasPlan);
			return;
		}
		// Plans read earlier in the session answer at once and refresh in the background, only the first read waits
		if (hasCachedMyDailyPlans?.()) {
			runTimerAction(hasPlan);
			void ensureMyDailyPlans();
			return;
		}
		planRequestPendingRef.current = true;
		void ensureMyDailyPlans()
			.then((plans) => runTimerAction(plans ? findTimerPlans(plans.items).hasPlan : hasPlan))
			.finally(() => {
				planRequestPendingRef.current = false;
			});
	}, [
		actionDisabled,
		ensureMyDailyPlans,
		hasCachedMyDailyPlans,
		hasPlan,
		requirePlan,
		runTimerAction,
		timerStatus?.running
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
		actionDisabled,
		startStopTimerHandler
	};
}
