import { STALE_TIMER_THRESHOLD } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

// ==================== TYPES ====================

interface TimerEligibilityState {
	isEmailVerified: boolean;
	hasActiveTask: boolean;
	isActiveTaskClosed: boolean;
	isTimerRunning: boolean;
	/** Whether the timer shows the run: the team-filtered status reads it as running */
	isRunShown: boolean;
	timerSource: ETimeLogSource | undefined;
}

export function canRunTimerForState(state: TimerEligibilityState): boolean {
	if (!state.isEmailVerified) return false;
	if (state.hasActiveTask && !state.isActiveTaskClosed) return true;
	// A run the timer shows can be stopped without an active task, which a reload leaves empty when the run's task is
	// in another project of the team (#5122)
	if (state.isRunShown) return true;
	return state.isTimerRunning && state.timerSource !== ETimeLogSource.TEAMS;
}

function isTaskInPlan(plan: TDailyPlan | undefined, taskId: string): boolean {
	const plannedTasks = plan?.tasks ?? [];
	return plannedTasks.some((plannedTask) => plannedTask.id === taskId);
}

/** A team that requires a plan lets a task card start only a task of today's plan, as the main Start does. */
export function canTrackTask(
	canTrack: boolean,
	requirePlan: boolean,
	plan: TDailyPlan | undefined,
	taskId: string
): boolean {
	if (!canTrack) {
		return false;
	}
	if (!requirePlan) {
		return true;
	}
	return isTaskInPlan(plan, taskId);
}

export function isRunningTeamsLog(lastLog: ITimeLog | null | undefined): lastLog is ITimeLog {
	return !!lastLog?.isRunning && lastLog.source === ETimeLogSource.TEAMS;
}

/**
 * Every web heartbeat moves the running log's stoppedAt to the server time, so a TEAMS log that is still
 * running with an old stoppedAt was left behind by a tab that closed without stopping it.
 *
 * A log whose stoppedAt never moved past its startedAt has had no heartbeat at all: it may come from a client
 * that sends none (the @ever-teams/atoms toolkit timers start with source TEAMS), so its age proves nothing
 * and it is never treated as stale. A threshold of 0 (NEXT_PUBLIC_STALE_TIMER_THRESHOLD_MINUTES=0) turns the
 * check off.
 */
export function isStaleTeamsTimer(
	lastLog: ITimeLog | null | undefined,
	now: number,
	thresholdMs: number = STALE_TIMER_THRESHOLD.value
): lastLog is ITimeLog & { stoppedAt: Date } {
	if (!thresholdMs || thresholdMs <= 0) return false;
	if (!isRunningTeamsLog(lastLog) || !lastLog.stoppedAt || !lastLog.startedAt) return false;
	const heartbeat = new Date(lastLog.stoppedAt).getTime();
	if (Number.isNaN(heartbeat) || heartbeat <= new Date(lastLog.startedAt).getTime()) return false;
	return now - heartbeat > thresholdMs;
}

/**
 * Modal types that the timer policy can request to show. Only a team that requires a plan gets them: elsewhere
 * planning the day is the member's choice, never a step of Start.
 *
 * - ENFORCE_PLAN: Hard block — task is NOT in today's plan.
 * - SUGGEST_DAILY_PLAN: Ask the user to create today's plan.
 * - TASKS_ESTIMATION_HOURS: Prompt user to estimate tasks / set work hours.
 */
export type TimerModalType = 'ENFORCE_PLAN' | 'SUGGEST_DAILY_PLAN' | 'TASKS_ESTIMATION_HOURS';

/**
 * Discriminated union of all possible timer actions.
 * The UI layer (hook) receives this and "executes" it.
 */
export type TimerAction =
	| { type: 'NOOP' }
	| { type: 'STOP_TIMER' }
	| { type: 'START_TIMER' }
	| { type: 'WARN_ALREADY_TRACKING' }
	| { type: 'SHOW_MODAL'; modal: TimerModalType };

/**
 * Pure input state for the timer policy decision tree.
 * All boolean flags are pre-computed by the hook before calling the policy.
 * No React, no localStorage, no side effects.
 */
export interface TimerPolicyState {
	/** Whether the timer status is currently being fetched */
	isTimerStatusFetching: boolean;
	/** Whether the timer is allowed to run (email verified, valid task, etc.) */
	canRunTimer: boolean;
	/** Whether the timer is currently running */
	isTimerRunning: boolean;
	/**
	 * Whether a timer runs that the timer does not show: one on a task outside the active team's tasks, started on
	 * another device or in another tab. The timer reads it as stopped and offers Start.
	 */
	hasHiddenRun: boolean;
	/** Whether the team requires a daily plan to track time */
	requirePlan: boolean;
	/** Whether a daily plan exists for today (with tasks) */
	hasPlan: boolean;
	/** Whether the currently active task is in today's plan */
	isActiveTaskPlanned: boolean;
	/** Whether ALL tasks in the plan have estimates > 0 */
	areAllTasksEstimated: boolean;
	/** Whether the plan has work time planned > 0 */
	hasWorkedHours: boolean;
	/**
	 * Absolute difference between planned work time and sum of task estimations (in hours).
	 * Used to detect significant mismatch between plan hours and task estimates.
	 */
	estimationTimeDifference: number;
	/** Whether the "Suggest Daily Plan" modal was already shown today (localStorage flag) */
	hasSeenSuggestionModalToday: boolean;
	/** Whether the "Tasks Estimate Hours" modal was already shown today (localStorage flag) */
	hasSeenEstimateHoursModalToday: boolean;
	/** Whether the "Daily Plan Estimate Hours" modal was already shown today (localStorage flag) */
	hasSeenPlanEstimateHoursModalToday: boolean;
}

// ==================== POLICY ====================

/**
 * Pure function that determines the next timer action based on the current state.
 *
 * This is the "brain" of the start/stop timer flow — a decision tree that returns
 * WHAT to do, not HOW to do it. The hook layer handles execution.
 *
 * Decision tree (in order of priority):
 * 1. Guards: fetching → NOOP, a run the timer does not show → WARN_ALREADY_TRACKING, can't run → NOOP
 * 2. Running → STOP_TIMER
 * 3. Team does not require a plan → START_TIMER
 * 4. Task not in today's plan → ENFORCE_PLAN (hard block)
 * 5. All modals seen today → startOrEstimate check
 * 6. Suggestion modal not seen → suggest plan or check estimation
 * 7. Estimate hours modal not seen → check estimation
 * 8. Fallback → startOrEstimate check
 */
export function getTimerAction(state: TimerPolicyState): TimerAction {
	// 1. Guards: the status is loading
	if (state.isTimerStatusFetching) {
		return { type: 'NOOP' };
	}
	// The timer offers Start over a run it does not show: a stop would end time tracked elsewhere unseen. Checked
	// before the next guard, so a Start shown disabled over such a run says why as well.
	if (state.hasHiddenRun) {
		return { type: 'WARN_ALREADY_TRACKING' };
	}
	// Cannot act
	if (!state.canRunTimer) {
		return { type: 'NOOP' };
	}

	// 2. Timer is running → stop it
	if (state.isTimerRunning) {
		return { type: 'STOP_TIMER' };
	}

	// 3. The team leaves planning to its members: Start starts, with or without a plan for today
	if (!state.requirePlan) {
		return { type: 'START_TIMER' };
	}

	// 4. Hard enforce: task NOT in today's plan
	if (state.hasPlan && !state.isActiveTaskPlanned) {
		return { type: 'SHOW_MODAL', modal: 'ENFORCE_PLAN' };
	}

	// 5. All modals already shown today → go straight to start/estimate check
	if (
		state.hasSeenSuggestionModalToday &&
		state.hasSeenEstimateHoursModalToday &&
		state.hasSeenPlanEstimateHoursModalToday
	) {
		return resolveStartOrEstimate(state);
	}

	// 6. Suggestion modal NOT shown today
	if (!state.hasSeenSuggestionModalToday) {
		if (!state.hasPlan) {
			return { type: 'SHOW_MODAL', modal: 'SUGGEST_DAILY_PLAN' };
		}
		return resolveEstimationFlow(state);
	}

	// 7. Estimate hours modal NOT shown today
	if (!state.hasSeenEstimateHoursModalToday) {
		return resolveEstimationFlow(state);
	}

	// 8. Fallback
	return resolveStartOrEstimate(state);
}

// ==================== INTERNAL HELPERS ====================

/**
 * Handles the "missing estimation hours" sub-flow: once a day, today's plan opens before the timer starts. The plan
 * holds the active task by now, step 4 blocked a start on any other.
 */
function resolveEstimationFlow(state: TimerPolicyState): TimerAction {
	if (!state.hasPlan) {
		return resolveStartOrEstimate(state);
	}

	if (!state.hasSeenEstimateHoursModalToday) {
		return { type: 'SHOW_MODAL', modal: 'TASKS_ESTIMATION_HOURS' };
	}

	return resolveStartOrEstimate(state);
}

/**
 * Final check before starting the timer of a team that requires a plan: estimates that are missing or far from the
 * planned hours open the estimation modal instead.
 */
function resolveStartOrEstimate(state: TimerPolicyState): TimerAction {
	if (!state.areAllTasksEstimated || !state.hasWorkedHours || state.estimationTimeDifference > 1) {
		return { type: 'SHOW_MODAL', modal: 'TASKS_ESTIMATION_HOURS' };
	}
	return { type: 'START_TIMER' };
}

/**
 * Read a localStorage flag and check if it matches today's date.
 * Returns true if the flag value equals the current date string (YYYY-MM-DD).
 */
export function hasSeenModalToday(key: string, currentDate: string): boolean {
	if (typeof window === 'undefined') return false;
	return window.localStorage.getItem(key) === currentDate;
}
