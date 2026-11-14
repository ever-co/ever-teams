'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useBreaksAllowed } from '@/core/hooks/timer/use-breaks-allowed';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { breakElapsedSecondsOf, breakRefusalKeyOf, timerBreakStateOf } from '@/core/lib/utils/timer/timer-break';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { activeTeamIdState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

const SECOND_MS = 1000;

/** The break request on its way, which disables the timer's buttons until its answer. */
export type TPendingBreakAction = 'take' | 'end' | null;

/**
 * Breaks from the timer (Gauzy #11940): whether the organization allows them, the break the member is on, and the
 * start and the end of a break. "Back to work" is the timer's own start, which ends the running break where the new
 * run starts.
 *
 * @param timerStatus The timer status the timer shows.
 * @param stopWork The timer's own stop: a break ends the work entry as Stop ends it, its last seconds synced and its
 * notes saved, before the break starts.
 */
export function useTimerBreak(timerStatus: ITimerStatus | null | undefined, stopWork: () => Promise<unknown> | void) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const allowsBreaks = useBreaksAllowed();
	const organizationTeamId = useAtomValue(activeTeamIdState);
	const breakState = timerBreakStateOf(timerStatus);
	const [pendingAction, setPendingAction] = useState<TPendingBreakAction>(null);
	const taskId = timerStatus?.lastLog?.taskId ?? null;
	const breakSource = timerStatus?.lastLog?.source ?? ETimeLogSource.TEAMS;

	// The timer, the team's cards and the entries the break changed
	const refreshAfterBreak = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.timer.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all })
		]);
	}, [queryClient]);

	const takeBreak = useCallback(async () => {
		setPendingAction('take');
		try {
			await stopWork();
		} catch {
			// The stop already told the member why: the work goes on, and no break starts
			setPendingAction(null);
			return;
		}
		try {
			await timerService.startBreak({ taskId, organizationTeamId });
		} catch (error) {
			const reasonKey = breakRefusalKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('breaks.REFUSED'), { id: 'timer-break-refused', description: t(reasonKey) });
		} finally {
			setPendingAction(null);
			await refreshAfterBreak();
		}
	}, [organizationTeamId, refreshAfterBreak, stopWork, t, taskId]);

	// Ends the break without starting work, the end of the day for one: Gauzy's stop ends a running break
	const endBreak = useCallback(async () => {
		setPendingAction('end');
		try {
			await timerService.stopTimer({ source: breakSource });
		} catch (error) {
			// 406: another tab or device ended it first
			const isAlreadyEnded = ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(406);
			if (!isAlreadyEnded) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('breaks.NOT_ENDED'), { id: 'timer-break-not-ended', description: t(reasonKey) });
			}
		} finally {
			setPendingAction(null);
			await refreshAfterBreak();
		}
	}, [breakSource, refreshAfterBreak, t]);

	return { allowsBreaks, breakState, pendingAction, takeBreak, endBreak };
}

/**
 * The break's running time in whole seconds, once per second while the member is on break.
 *
 * @param startedAtMs When the break started, in milliseconds (a number, so a re-read status keeps the same clock).
 */
export function useBreakElapsedSeconds(startedAtMs: number | null): number {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		if (startedAtMs === null) {
			return undefined;
		}
		setNow(new Date());
		const interval = setInterval(() => setNow(new Date()), SECOND_MS);
		return () => clearInterval(interval);
	}, [startedAtMs]);
	if (startedAtMs === null) {
		return 0;
	}
	return breakElapsedSecondsOf(new Date(startedAtMs), now);
}
