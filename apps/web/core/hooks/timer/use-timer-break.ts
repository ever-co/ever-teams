'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useBreaksAllowed } from '@/core/hooks/timer/use-breaks-allowed';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { breakElapsedSecondsOf, breakRefusalKeyOf, timerBreakStateOf } from '@/core/lib/utils/timer/timer-break';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { startUnderTimerGuard } from '@/core/hooks/timer/use-timer-api';
import { activeTeamIdState, timerStartsInFlightState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

const SECOND_MS = 1000;

/** Gauzy's answer to a stop naming a run that is no longer the running one: nothing was stopped. */
const RUN_CHANGED_STATUS = 409;

/**
 * Ends the break this tab shows, and nothing else: Gauzy's stop ends whatever runs. The break is read afresh and named
 * in the stop, so work another tab or device started meanwhile goes on. A fresh status showing another run, or Gauzy's
 * 409 to a stop that reached it after the run changed, means the run changed: nothing is stopped, and the display
 * follows the run that goes on.
 *
 * @param shownBreakId The break this tab shows; null when it does not know its id, and nothing is stopped then.
 * @param source The app the break was started with, which the stop names.
 */
async function endShownBreak(shownBreakId: string | null, source: ETimeLogSource): Promise<void> {
	const { data: status } = await timerService.getTimerStatus();
	const freshBreakId = timerBreakStateOf(status).isOnBreak ? status?.lastLog?.id : undefined;
	const isShownBreak = Boolean(freshBreakId) && freshBreakId === shownBreakId;
	if (!isShownBreak) {
		return;
	}
	try {
		await timerService.stopTimer({ source, timeLogId: freshBreakId });
	} catch (error) {
		const isRunChanged = ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(RUN_CHANGED_STATUS);
		if (isRunChanged) {
			return;
		}
		throw error;
	}
}

type TStore = ReturnType<typeof useStore>;

/**
 * Runs a break's requests counted among the timer requests the organization switch waits for (#5204, #5263). They are
 * plain service calls, outside the mutations the switch also waits for, and the timer shows stopped meanwhile: a switch
 * then would leave the break running, or not ended, in the organization left behind.
 */
async function countedInSwitchGuard<T>(store: TStore, run: () => Promise<T>): Promise<T> {
	store.set(timerStartsInFlightState, (count) => count + 1);
	try {
		return await run();
	} finally {
		store.set(timerStartsInFlightState, (count) => Math.max(0, count - 1));
	}
}

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
	const store = useStore();
	const allowsBreaks = useBreaksAllowed();
	const organizationTeamId = useAtomValue(activeTeamIdState);
	const breakState = timerBreakStateOf(timerStatus);
	const [pendingAction, setPendingAction] = useState<TPendingBreakAction>(null);
	const taskId = timerStatus?.lastLog?.taskId ?? null;
	const breakSource = timerStatus?.lastLog?.source ?? ETimeLogSource.TEAMS;
	const shownBreakId = breakState.isOnBreak ? (timerStatus?.lastLog?.id ?? null) : null;

	// The timer, the team's cards and the entries the break changed
	const refreshAfterBreak = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.timer.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
			queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all })
		]);
	}, [queryClient]);

	// The work's stop, then the break's start. True once the break's start was asked, whatever its answer.
	const stopWorkThenStartBreak = useCallback(async () => {
		try {
			await stopWork();
		} catch {
			// The stop already told the member why: the work goes on, and no break starts
			return false;
		}
		try {
			await timerService.startBreak({ taskId, organizationTeamId });
		} catch (error) {
			const reasonKey = breakRefusalKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('breaks.REFUSED'), { id: 'timer-break-refused', description: t(reasonKey) });
		}
		return true;
	}, [organizationTeamId, stopWork, t, taskId]);

	const takeBreak = useCallback(async () => {
		let asksBreak = false;
		// Under the start guard every timer shares, from the stop to the break's start: a start asked meanwhile (the
		// other timer, a task card, the start key) cannot land beside the break and be ended by it, or end it
		const breakStart = startUnderTimerGuard(async () => {
			asksBreak = await countedInSwitchGuard(store, stopWorkThenStartBreak);
		});
		if (!breakStart) {
			toast.warning(t('toasts.timer.START_IN_PROGRESS'), { id: 'timer-start-in-progress' });
			return;
		}
		setPendingAction('take');
		try {
			await breakStart;
		} finally {
			setPendingAction(null);
		}
		if (asksBreak) {
			await refreshAfterBreak();
		}
	}, [refreshAfterBreak, stopWorkThenStartBreak, store, t]);

	// Ends the break without starting work, the end of the day for one: Gauzy's stop ends a running break
	const endBreak = useCallback(async () => {
		setPendingAction('end');
		try {
			await countedInSwitchGuard(store, () => endShownBreak(shownBreakId, breakSource));
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
	}, [breakSource, refreshAfterBreak, shownBreakId, store, t]);

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
		const tick = () => setNow(new Date());
		// Read the clock at once for a break that just showed, then once per second
		const firstTick = setTimeout(tick, 0);
		const interval = setInterval(tick, SECOND_MS);
		return () => {
			clearTimeout(firstTick);
			clearInterval(interval);
		};
	}, [startedAtMs]);
	if (startedAtMs === null) {
		return 0;
	}
	return breakElapsedSecondsOf(new Date(startedAtMs), now);
}
