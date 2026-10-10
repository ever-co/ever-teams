'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { isRunningTeamsLog, isStaleTeamsTimer } from '@/core/lib/helpers/timer-policy';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerService } from '@/core/services/client/api/timers';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { TEmployee } from '@/core/types/schemas/organization/employee.schema';

/**
 * Stops a TEAMS timer that a closed tab left running, at its last heartbeat rather than now, so the time
 * after the tab closed is not credited. Resolves to true when the employee's last log was such a timer.
 */
export function useStopStaleTeamsTimer() {
	const t = useTranslations();
	const locale = useLocale();
	const queryClient = useQueryClient();

	return useCallback(
		async (employeeId: string) => {
			const response = await timerService.getLastTimerLog(employeeId);
			const lastLog = response.data?.[0]?.lastLog;
			// A client clock running fast would cut live timers: use the server clock when the response exposes it.
			const serverNow = Date.parse(response.headers?.date ?? '');
			if (!isStaleTeamsTimer(lastLog, Number.isNaN(serverNow) ? Date.now() : serverNow)) return false;

			try {
				await timerService.stopTimer({
					source: ETimeLogSource.TEAMS,
					startedAt: lastLog.startedAt,
					stoppedAt: lastLog.stoppedAt
				});
			} catch (error) {
				// 406: another tab or device stopped it first.
				if (!(ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(406))) throw error;
			}

			toast.info(t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'), {
				description: t('timer.STALE_TIMER_STOPPED_DESCRIPTION', {
					stoppedAt: new Date(lastLog.stoppedAt).toLocaleString(locale, {
						dateStyle: 'medium',
						timeStyle: 'short'
					})
				})
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			return true;
		},
		[locale, queryClient, t]
	);
}

/**
 * Checks once per employee, when the app loads, for a TEAMS timer left running by a closed tab. Returns
 * true when the check is over: the heartbeat must wait for it, or it would revive the stale timer.
 */
export function useStaleTimerGuard(
	employee: Pick<TEmployee, 'id' | 'isTrackingTime'> | null | undefined,
	enabled: boolean
): boolean {
	const stopStaleTeamsTimer = useStopStaleTeamsTimer();
	const employeeId = employee?.id;
	const isTrackingTime = !!employee?.isTrackingTime;
	const checkedRef = useRef<string | null>(null);
	const [settledFor, setSettledFor] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!enabled || !employeeId || checkedRef.current === employeeId) return;
		checkedRef.current = employeeId;
		if (!isTrackingTime) {
			setSettledFor(employeeId);
			return;
		}
		let retryTimer: number | undefined;
		void stopStaleTeamsTimer(employeeId).then(
			() => {
				if (checkedRef.current === employeeId) setSettledFor(employeeId);
			},
			(error) => {
				logErrorInDev('[Timer] Stale timer check failed, retrying:', error);
				// Releasing the heartbeat now would move a stale log's stoppedAt to the present and credit the
				// closed-tab gap, so it keeps waiting until a check goes through.
				if (checkedRef.current !== employeeId) return;
				checkedRef.current = null;
				retryTimer = window.setTimeout(() => setAttempt((count) => count + 1), SYNC_TIMER_INTERVAL);
			}
		);
		return () => window.clearTimeout(retryTimer);
	}, [attempt, enabled, employeeId, isTrackingTime, stopStaleTeamsTimer]);

	return !employeeId || settledFor === employeeId;
}

/**
 * /timesheet/timer/status only sees logs started on the server's current day, so a timer still running past the
 * server's midnight reads as stopped there, and without its heartbeat the stale check would cut it at that midnight.
 * When the status says stopped although this tab saw the timer run or the employee is tracking time, the last log
 * (any day) tells whether a TEAMS timer still runs. It is polled only while one does, so the heartbeat stops with it.
 */
export function useTimerRunningPastMidnight(
	employee: Pick<TEmployee, 'id' | 'isTrackingTime'> | null | undefined,
	statusRunning: boolean,
	enabled: boolean
): boolean {
	const employeeId = employee?.id;
	const [sawRunning, setSawRunning] = useState(statusRunning);

	useEffect(() => {
		if (statusRunning) setSawRunning(true);
	}, [statusRunning]);

	const checkLastLog = enabled && !statusRunning && !!employeeId && (sawRunning || !!employee?.isTrackingTime);
	const { data: lastLog } = useQuery({
		queryKey: queryKeys.timer.lastLog(employeeId),
		queryFn: async () => (await timerService.getLastTimerLog(employeeId!)).data?.[0]?.lastLog ?? null,
		enabled: checkLastLog,
		staleTime: 0,
		// A failed read keeps polling: a first read that fails has no data, and stopping there would end the
		// heartbeat of a timer that may still run.
		refetchInterval: (query) =>
			query.state.status === 'error' || isRunningTeamsLog(query.state.data) ? SYNC_TIMER_INTERVAL : false
	});

	return statusRunning || (checkLastLog && isRunningTeamsLog(lastLog));
}
