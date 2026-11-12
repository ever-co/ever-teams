'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { onSignOut } from '@/core/lib/auth/sign-out-cleanups';
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
			// Without it (the Gauzy API's CORS does not expose Date in direct mode), allow 5 minutes of client skew.
			const serverNow = Date.parse(response.headers?.date ?? '');
			const now = Number.isNaN(serverNow) ? Date.now() - 5 * 60_000 : serverNow;
			if (!isStaleTeamsTimer(lastLog, now)) return false;

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

			const stoppedAt = new Date(lastLog.stoppedAt).toLocaleString(locale, {
				dateStyle: 'medium',
				timeStyle: 'short'
			});
			toast.info(t('toasts.timer.STALE_STOPPED', { stoppedAt }), {
				id: 'timer-stale-stopped',
				description: t('toasts.timer.STALE_STOPPED_HINT')
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			return true;
		},
		[locale, queryClient, t]
	);
}

/**
 * The page's closed-tab checks: the employees whose check is over, and the check in flight per employee. Module
 * scope on purpose (#5118): the check runs once per page load. The timer's owner mounts again within a page (the
 * (main) layout after a page outside it), and a check made again then found the run this page kept alive stale,
 * with no heartbeat while the owner was unmounted, and stopped it as left behind by a closed tab. A run this page
 * keeps alive is never one the check sees: the heartbeat waits for the check, which does not run again.
 */
const checkedEmployees = new Set<string>();
const checksInFlight = new Map<string, Promise<void>>();

// The person's runs, as this page knew them, go with the session (sign-out-cleanups.ts)
onSignOut(() => {
	checkedEmployees.clear();
	checksInFlight.clear();
});

/** Runs the employee's check unless this page ran it: a check in flight is shared, a failed one runs again. */
function checkOncePerPage(employeeId: string, check: () => Promise<unknown>): Promise<void> {
	const inFlight = checksInFlight.get(employeeId);
	if (inFlight) return inFlight;
	const request: Promise<void> = check()
		.then(() => {
			if (checksInFlight.get(employeeId) === request) checkedEmployees.add(employeeId);
		})
		.finally(() => {
			if (checksInFlight.get(employeeId) === request) checksInFlight.delete(employeeId);
		});
	checksInFlight.set(employeeId, request);
	return request;
}

/**
 * Checks once per employee and page load, when the app loads, for a TEAMS timer left running by a closed tab.
 * Returns true when the check is over: the heartbeat must wait for it, or it would revive the stale timer.
 */
export function useStaleTimerGuard(
	employee: Pick<TEmployee, 'id' | 'isTrackingTime'> | null | undefined,
	enabled: boolean
): boolean {
	const stopStaleTeamsTimer = useStopStaleTeamsTimer();
	const employeeId = employee?.id;
	const isTrackingTime = !!employee?.isTrackingTime;
	const [settledFor, setSettledFor] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!enabled || !employeeId) return;
		if (checkedEmployees.has(employeeId)) {
			setSettledFor(employeeId);
			return;
		}
		let isCurrent = true;
		let retryTimer: number | undefined;
		// An employee who is not tracking time has no run left behind
		const check = isTrackingTime ? () => stopStaleTeamsTimer(employeeId) : () => Promise.resolve();
		void checkOncePerPage(employeeId, check).then(
			() => {
				if (isCurrent) setSettledFor(employeeId);
			},
			(error) => {
				logErrorInDev('[Timer] Stale timer check failed, retrying:', error);
				// Releasing the heartbeat now would move a stale log's stoppedAt to the present and credit the
				// closed-tab gap, so it keeps waiting until a check goes through.
				if (!isCurrent) return;
				retryTimer = window.setTimeout(() => setAttempt((count) => count + 1), SYNC_TIMER_INTERVAL);
			}
		);
		return () => {
			isCurrent = false;
			window.clearTimeout(retryTimer);
		};
	}, [attempt, enabled, employeeId, isTrackingTime, stopStaleTeamsTimer]);

	return !employeeId || settledFor === employeeId;
}

/**
 * The employee's last time log, whatever its day: the query of the check below. Any other reader of it (the timer
 * reminders) takes these options with the query off, so it never runs the query with a function of its own.
 */
export function lastTimerLogQuery(employeeId: string | null | undefined) {
	return {
		queryKey: queryKeys.timer.lastLog(employeeId),
		queryFn: async () => (await timerService.getLastTimerLog(employeeId!)).data?.[0]?.lastLog ?? null
	};
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
		...lastTimerLogQuery(employeeId),
		enabled: checkLastLog,
		staleTime: 0,
		// A failed read keeps polling: a first read that fails has no data, and stopping there would end the
		// heartbeat of a timer that may still run.
		refetchInterval: (query) =>
			query.state.status === 'error' || isRunningTeamsLog(query.state.data) ? SYNC_TIMER_INTERVAL : false
	});

	return statusRunning || (checkLastLog && isRunningTeamsLog(lastLog));
}
