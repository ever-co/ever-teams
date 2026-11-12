import { atom } from 'jotai';

/**
 * The run the app's timer owner reminds of (#5022), with that owner's stop: what the "Stop timer" of a timer reminder
 * in the inbox acts on, so the inbox stops the timer the way the rest of the app does.
 */
export interface TimerReminderTarget {
	/** The run's key: its time log, as the platform's reminders name it. */
	runKey: string;
	stop: () => unknown;
}

/** Set while the timer runs, null otherwise. */
export const timerReminderTargetState = atom<TimerReminderTarget | null>(null);
