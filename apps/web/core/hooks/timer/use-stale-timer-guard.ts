'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { isStaleTeamsTimer } from '@/core/lib/helpers/timer-policy';
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

	useEffect(() => {
		if (!enabled || !employeeId || checkedRef.current === employeeId) return;
		checkedRef.current = employeeId;
		if (!isTrackingTime) {
			setSettledFor(employeeId);
			return;
		}
		void stopStaleTeamsTimer(employeeId)
			.catch((error) => logErrorInDev('[Timer] Stale timer check failed:', error))
			.finally(() => setSettledFor(employeeId));
	}, [enabled, employeeId, isTrackingTime, stopStaleTeamsTimer]);

	return !employeeId || settledFor === employeeId;
}
