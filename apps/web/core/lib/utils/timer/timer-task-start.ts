export type TimerTaskStartAction =
	| 'TASK_CLOSED'
	| 'ALREADY_RUNNING'
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
	/** The main Start is disabled (the account cannot start a timer yet). */
	isMainStartDisabled: boolean;
	/** The team's daily plan rule lets a card start this task. */
	canTrackTask: boolean;
}

/**
 * What a start asked from outside the task's own card does, by the rules of that card. With no timer running, the
 * active task goes through the main Start and its daily plan dialogs. Any other start goes through the card's start,
 * which stops the running timer first and which the plan rule can refuse.
 */
export function timerTaskStartActionOf(state: TimerTaskStartState): TimerTaskStartAction {
	if (state.isTaskClosed) {
		return 'TASK_CLOSED';
	}
	if (state.isRunningOnTask) {
		return 'ALREADY_RUNNING';
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
