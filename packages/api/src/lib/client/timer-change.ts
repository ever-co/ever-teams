import { ITimerStatus, TimerChange } from '@ever-teams/toolkit-types';

export type { TimerChange } from '@ever-teams/toolkit-types';

type TimerState = Omit<TimerChange, 'initial'>;

// A stopped timer, a running break included (the API answers running: false for it), has no running entry to tell of.
function timerStateOf(status: ITimerStatus): TimerState {
	const running = status.running === true;
	const log = status.lastLog;
	if (!running || !log) {
		return { running, startedAt: null, projectId: null, taskId: null };
	}
	return {
		running,
		startedAt: log.startedAt ?? null,
		projectId: log.projectId ?? null,
		taskId: log.taskId ?? null
	};
}

function isSameState(state: TimerState, previous: TimerChange): boolean {
	const sameRun = state.running === previous.running && state.startedAt === previous.startedAt;
	const sameWork = state.projectId === previous.projectId && state.taskId === previous.taskId;
	return sameRun && sameWork;
}

/**
 * What a read of the timer status tells after `previous`, the last change told: null when the timer is as it was.
 * The first read (`previous` null) always tells the timer as it is, with `initial: true`.
 *
 * @example
 * let last = null;
 * const change = timerChangeOf(await teams.timer.status(), last);
 * if (change) {
 * 	last = change;
 * 	showTimer(change.running, change.startedAt);
 * }
 */
export function timerChangeOf(status: ITimerStatus, previous: TimerChange | null): TimerChange | null {
	const state = timerStateOf(status);
	if (previous === null) {
		return { ...state, initial: true };
	}
	if (isSameState(state, previous)) {
		return null;
	}
	return { ...state, initial: false };
}
