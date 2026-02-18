// ==================== TYPES ====================

/**
 * Modal types that the timer policy can request to show.
 *
 * - ENFORCE_PLAN: Hard block — task is NOT in today's plan and team requires a plan.
 * - ENFORCE_PLAN_SOFT: Soft prompt — task is not planned, but user can add it.
 * - SUGGEST_DAILY_PLAN: Suggest the user create a daily plan.
 * - TASKS_ESTIMATION_HOURS: Prompt user to estimate tasks / set work hours.
 */
export type TimerModalType = 'ENFORCE_PLAN' | 'ENFORCE_PLAN_SOFT' | 'SUGGEST_DAILY_PLAN' | 'TASKS_ESTIMATION_HOURS';

/**
 * Discriminated union of all possible timer actions.
 * The UI layer (hook) receives this and "executes" it.
 */
export type TimerAction =
	| { type: 'NOOP' }
	| { type: 'STOP_TIMER' }
	| { type: 'START_TIMER' }
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
 * 1. Guard: fetching or can't run → NOOP
 * 2. Running → STOP_TIMER
 * 3. Require plan + task not planned → ENFORCE_PLAN (hard block)
 * 4. All modals seen today → startOrEstimate check
 * 5. Suggestion modal not seen → suggest plan or check estimation
 * 6. Estimate hours modal not seen → check estimation
 * 7. Fallback → startOrEstimate check
 */
export function getTimerAction(state: TimerPolicyState): TimerAction {
	// 1. Guard: cannot act
	if (state.isTimerStatusFetching || !state.canRunTimer) {
		return { type: 'NOOP' };
	}

	// 2. Timer is running → stop it
	if (state.isTimerRunning) {
		return { type: 'STOP_TIMER' };
	}

	// 3. Hard enforce: plan required + task NOT in plan
	if (state.requirePlan && state.hasPlan && !state.isActiveTaskPlanned) {
		return { type: 'SHOW_MODAL', modal: 'ENFORCE_PLAN' };
	}

	// 4. All modals already shown today → go straight to start/estimate check
	if (state.hasSeenSuggestionModalToday && state.hasSeenEstimateHoursModalToday && state.hasSeenPlanEstimateHoursModalToday) {
		return resolveStartOrEstimate(state);
	}

	// 5. Suggestion modal NOT shown today
	if (!state.hasSeenSuggestionModalToday) {
		if (!state.hasPlan) {
			return { type: 'SHOW_MODAL', modal: 'SUGGEST_DAILY_PLAN' };
		}
		return resolveEstimationFlow(state);
	}

	// 6. Estimate hours modal NOT shown today
	if (!state.hasSeenEstimateHoursModalToday) {
		return resolveEstimationFlow(state);
	}

	// 7. Fallback
	return resolveStartOrEstimate(state);
}

// ==================== INTERNAL HELPERS ====================

/**
 * Handles the "missing estimation hours" sub-flow.
 * Mirrors the original handleMissingTasksEstimationHours + handleCheckSelectedTaskOnTodayPlan.
 */
function resolveEstimationFlow(state: TimerPolicyState): TimerAction {
	if (!state.hasPlan) {
		return resolveStartOrEstimate(state);
	}

	if (!state.hasSeenEstimateHoursModalToday) {
		// Check if active task is in plan
		if (state.isActiveTaskPlanned) {
			return { type: 'SHOW_MODAL', modal: 'TASKS_ESTIMATION_HOURS' };
		}
		return { type: 'SHOW_MODAL', modal: 'ENFORCE_PLAN_SOFT' };
	}

	if (state.areAllTasksEstimated) {
		return resolveStartOrEstimate(state);
	}

	return resolveStartOrEstimate(state);
}

/**
 * Final check before starting the timer.
 * If plan is required and estimates are incomplete/mismatched, show estimation modal.
 */
function resolveStartOrEstimate(state: TimerPolicyState): TimerAction {
	if (
		state.requirePlan &&
		(!state.areAllTasksEstimated || !state.hasWorkedHours || state.estimationTimeDifference > 1)
	) {
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
