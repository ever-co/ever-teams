'use client';

import { useCallback } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isRunningTeamsLog } from '@/core/lib/helpers/timer-policy';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { lastTimerLogQuery } from './use-stale-timer-guard';

/**
 * The stop of a run the timer's owner found past midnight (#5022), for its reminders: the day's status says stopped, so
 * the owner's stop would do nothing, and this one stops that run itself. A run started since is not stopped, a failure
 * is said unless the run ended all the same, and the timer's queries are read again after.
 *
 * @param employeeId The employee whose timer the app owns.
 * @param pastMidnightLog The run found past midnight: its last log, still running.
 */
export function useStopPastMidnightRun(employeeId: string | null | undefined, pastMidnightLog: ITimeLog | null) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const pastMidnightSource = pastMidnightLog?.source ?? ETimeLogSource.TEAMS;
	const pastMidnightRunId = pastMidnightLog?.id;

	return useCallback(async () => {
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
}
