export type TimerTaskStartAction =
	| 'TASK_CLOSED'
	| 'ALREADY_RUNNING'
	| 'HIDDEN_RUN'
	| 'UNAVAILABLE'
	| 'MAIN_START'
	| 'BLOCKED_BY_PLAN'
	| 'TASK_START';

export interface TimerTaskStartState {
	isTaskClosed: boolean;
	/** The task is the member's active one and the timer status is known: its card shows the main start and stop. */
	isActiveTask: boolean;
	isTimerRunning: boolean;
	/** The running timer records this very task. */
	isRunningOnTask: boolean;
	/**
	 * A timer runs that the timer does not show (another team's, started on another device or in another tab): the
	 * timer reads it as stopped, so the member cannot see what a start would stop.
	 */
	hasHiddenRun: boolean;
	/** The main Start is disabled (the account cannot start a timer yet). */
	isMainStartDisabled: boolean;
	/** The team's daily plan rule lets a card start this task. */
	canTrackTask: boolean;
}

/**
 * What a start asked from outside the task's own card does, by the rules of that card. With no timer running, the
 * active task goes through the main Start and its daily plan dialogs. Any other start goes through the card's start,
 * which stops the running timer first and which the plan rule can refuse. Like the main Start, it never stops a run
 * the timer does not show: that would end time tracked elsewhere unseen.
 */
export function timerTaskStartActionOf(state: TimerTaskStartState): TimerTaskStartAction {
	if (state.isTaskClosed) {
		return 'TASK_CLOSED';
	}
	if (state.isRunningOnTask) {
		return 'ALREADY_RUNNING';
	}
	if (state.hasHiddenRun) {
		return 'HIDDEN_RUN';
	}
	const startsFromRest = state.isActiveTask && !state.isTimerRunning;
	if (startsFromRest) {
		if (state.isMainStartDisabled) {
			return 'UNAVAILABLE';
		}
		return 'MAIN_START';
	}
	if (!state.canTrackTask) {
		return 'BLOCKED_BY_PLAN';
	}
	return 'TASK_START';
}
