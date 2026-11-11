'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTimerReminders } from '@/core/hooks/notifications/use-timer-reminders';
import { lastTimerLogQuery } from '@/core/hooks/timer/use-stale-timer-guard';
import { isRunningTeamsLog } from '@/core/lib/helpers/timer-policy';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { timerStatusState } from '@/core/stores/timer/timer';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

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
	const t = useTranslations();
	const queryClient = useQueryClient();
	const status = useAtomValue(timerStatusState);
	// The last log the owner reads for its check: the same query, never run from here
	const { data: lastLog } = useQuery({ ...lastTimerLogQuery(employeeId), enabled: false });
	const pastMidnightLog = runsPastMidnight && isRunningTeamsLog(lastLog) ? lastLog : null;
	const timerStatus = pastMidnightLog ? { ...status, running: true, lastLog: pastMidnightLog } : status;

	// The day's status says stopped, so the owner's stop would do nothing: the reminder stops that run itself
	const pastMidnightSource = pastMidnightLog?.source ?? ETimeLogSource.TEAMS;
	const pastMidnightRunId = pastMidnightLog?.id;
	const stopPastMidnight = useCallback(async () => {
		// The employee's last log read anew, and whether it is still the run the reminder is about
		const readLastLog = () =>
			queryClient.fetchQuery({ ...lastTimerLogQuery(employeeId), staleTime: 0 }).catch(() => undefined);
		const isThisRun = (log: ITimeLog | null | undefined) => isRunningTeamsLog(log) && log.id === pastMidnightRunId;
		try {
			// Gauzy stops whatever runs now: a run started since (on another device, once this one stopped) is not this
			// reminder's to stop. When that read fails, the stop goes ahead, as the employee asked.
			const current = await readLastLog();
			if (current !== undefined && !isThisRun(current)) {
				return;
			}
			await timerService.stopTimer({ source: pastMidnightSource });
		} catch (error) {
			// 406: another tab or device stopped it first
			if (ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(406)) {
				return;
			}
			// The stop may have landed although the answer failed (the status read that follows it): the run's last log
			// says whether it still runs. A read that fails too leaves the failure standing, as the owner's stop does.
			const lastLogNow = await readLastLog();
			const stillRuns = lastLogNow === undefined || isThisRun(lastLogNow);
			if (stillRuns) {
				toast.error(t('toasts.timer.STOP_FAILED'), {
					id: 'timer-stop-failed',
					description: t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)
				});
			}
		} finally {
			await queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
		}
	}, [employeeId, pastMidnightRunId, pastMidnightSource, queryClient, t]);

	useTimerReminders({ timerStatus, stopTimer: pastMidnightLog ? stopPastMidnight : stopTimer });
	return null;
}
