'use client';

import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { useTimerReminders } from '@/core/hooks/notifications/use-timer-reminders';
import { lastTimerLogQuery } from '@/core/hooks/timer/use-stale-timer-guard';
import { useStopPastMidnightRun } from '@/core/hooks/timer/use-stop-past-midnight-run';
import { isRunningTeamsLog } from '@/core/lib/helpers/timer-policy';
import { timerStatusState } from '@/core/stores/timer/timer';

interface TimerRemindersProps {
	/** The stop of the app's single timer owner. */
	stopTimer: () => unknown;
	/** The employee whose timer the app owns. */
	employeeId?: string | null;
	/**
	 * Whether the timer runs past midnight: the day's status says stopped while its last log still runs (the owner's
	 * check, useTimerRunningPastMidnight, for a Gauzy whose status sees only the day's logs). An evening timer is the
	 * one most likely forgotten.
	 */
	runsPastMidnight: boolean;
}

/**
 * The reminders of a timer left running (#5022), on every page of the app: the timer's own status, whatever the team
 * it runs for, or the run the owner found past midnight. A component of its own, so a status update re-renders it
 * alone.
 */
export function TimerReminders({ stopTimer, employeeId, runsPastMidnight }: Readonly<TimerRemindersProps>) {
	const status = useAtomValue(timerStatusState);
	// The last log the owner reads for its check: the same query, never run from here
	const { data: lastLog } = useQuery({ ...lastTimerLogQuery(employeeId), enabled: false });
	const pastMidnightLog = runsPastMidnight && isRunningTeamsLog(lastLog) ? lastLog : null;
	const timerStatus = pastMidnightLog ? { ...status, running: true, lastLog: pastMidnightLog } : status;

	// The day's status says stopped, so the owner's stop would do nothing: the reminder stops that run itself
	const stopPastMidnight = useStopPastMidnightRun(employeeId, pastMidnightLog);

	useTimerReminders({ timerStatus, stopTimer: pastMidnightLog ? stopPastMidnight : stopTimer });
	return null;
}
