'use client';

import { useAtomValue } from 'jotai';
import { useTimerReminders } from '@/core/hooks/notifications/use-timer-reminders';
import { timerStatusState } from '@/core/stores/timer/timer';

/**
 * The reminders of a timer left running (#5022), on every page of the app: the timer's own status, whatever the team
 * it runs for, and the stop of the app's single timer owner. A component of its own, so a status update re-renders it
 * alone.
 */
export function TimerReminders({ stopTimer }: Readonly<{ stopTimer: () => unknown }>) {
	useTimerReminders({ timerStatus: useAtomValue(timerStatusState), stopTimer });
	return null;
}
