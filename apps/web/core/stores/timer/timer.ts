import { atom } from 'jotai';
import { ILocalTimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { ITimerStatus, ITimerStatusReceipt } from '@/core/types/interfaces/timer/timer-status';

export const timerStatusState = atom<ITimerStatus | null>(null);

export const timerStatusFetchingState = atom<boolean>(false);

export const timeCounterState = atom<number>(0);

export const timerSecondsState = atom<number>(0);

export const timeCounterIntervalState = atom<number>(0);

export const localTimerStatusState = atom<ILocalTimerStatus | null>(null);

/**
 * The task the timer runs on, or is starting on: the local status says so before the start request is sent, the
 * server status once the run began, whichever device started it. Null while no timer runs.
 */
export const timerTaskIdState = atom<string | null>((get) => {
	const localStatus = get(localTimerStatusState);
	if (localStatus?.running && localStatus.lastTaskId) {
		return localStatus.lastTaskId;
	}
	const status = get(timerStatusState);
	if (status?.running && status.lastLog?.taskId) {
		return status.lastLog.taskId;
	}
	return null;
});

// When the shell received the current status: a running status duration counts the running log up to then
export const timerStatusReceiptState = atom<ITimerStatusReceipt>({ status: null, receivedAt: 0 });
