import { useCallback, useEffect, useReducer, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { translate } from '../../i18n/translate';
import { useStores } from '../../models';
import { runStartOf } from '../../helpers/timer-run-start';
import {
	TimerDiscardFailure,
	discardFailureKeyOf,
	discardSourceKeyOf,
	timerDiscardAvailabilityOf,
	timerDiscardFailureOf
} from '../../helpers/timer-discard';
import { discardTimerRequest, getTimerStatusRequest } from '../client/requests/timer';
import useCurrentOrganization, {
	currentOrganizationQueryKey
} from '../client/queries/organization/current-organization';
import { IApiRefusal, ITimerStatus } from '../interfaces/ITimer';

/** Failures that mean the timer is no longer what the screen shows: its status is read again. */
const STALE_TIMER_FAILURES: ReadonlySet<TimerDiscardFailure> = new Set(['NOT_RUNNING', 'CHANGED']);
/** Failures that mean the organization's settings changed: they are read again, which hides the action. */
const STALE_SETTINGS_FAILURES: ReadonlySet<TimerDiscardFailure> = new Set(['DISABLED', 'TOO_LATE']);

/** The timer's own status read: it syncs a time slot on each read while the screen shows the timer running. */
const TIMER_STATUS_QUERY_KEY = ['status-timer'];
/** The other queries that count today's time: they are read again once the run is gone. */
const TIME_QUERY_KEYS = [['tasks'], ['teams']];

/** Tells the person why the run was not discarded. */
function tellFailure(failure: TimerDiscardFailure) {
	showMessage({ message: translate(discardFailureKeyOf(failure)), type: 'danger' });
}

/**
 * The Discard of the running timer (ever-co/ever-teams#5373): whether the running timer offers it (the organization's
 * switch and age limit, an API that knows the discard, a run that is not the desktop app's), and the discard itself.
 *
 * A discard names the run the confirmation was opened for, so a run started meanwhile elsewhere is never removed. On
 * success the timer reads the stopped status the API answers (stopped too when that read fails: the run is gone all
 * the same), unless the screen shows another run by then, and the views that count today's time read again; on a
 * refusal the timer stays as it is and the person is told why.
 */
export function useTimerDiscard() {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		TimerStore: timerStore
	} = useStores();
	const { timerStatus, setTimerStatus } = timerStore;
	const [discarding, setDiscarding] = useState(false);
	// Bumped when the organization's age limit closes the offer, so the availability is read again then
	const [, readAvailabilityAgain] = useReducer((count: number) => count + 1, 0);

	const running = timerStatus?.running === true;
	const runningLog = timerStatus?.lastLog;
	const organizationQuery = useCurrentOrganization({
		authToken: authToken ?? '',
		tenantId,
		organizationId,
		enabled: running
	});

	const availability = timerDiscardAvailabilityOf({
		organization: organizationQuery.data ?? null,
		running,
		runningLogId: runningLog?.id,
		source: runningLog?.source,
		startedAt: runStartOf(timerStatus),
		now: Date.now()
	});
	const closesAt = availability.available ? availability.closesAt : null;

	useEffect(() => {
		if (closesAt === null) {
			return undefined;
		}
		const timeout = setTimeout(readAvailabilityAgain, Math.max(0, closesAt - Date.now()));
		return () => clearTimeout(timeout);
	}, [closesAt]);

	const readAgainAfter = useCallback(
		(reason: TimerDiscardFailure | 'DISCARDED') => {
			const timerChanged = reason !== 'DISCARDED' && STALE_TIMER_FAILURES.has(reason);
			const timeChanged = reason === 'DISCARDED' || timerChanged;
			if (timeChanged) {
				for (const queryKey of TIME_QUERY_KEYS) {
					void queryClient.invalidateQueries({ queryKey });
				}
			}
			// After a discard, the discard itself settles the timer's status (below)
			if (timerChanged) {
				void queryClient.invalidateQueries({ queryKey: TIMER_STATUS_QUERY_KEY });
			}
			const settingsChanged = reason !== 'DISCARDED' && STALE_SETTINGS_FAILURES.has(reason);
			if (settingsChanged) {
				void queryClient.invalidateQueries({ queryKey: currentOrganizationQueryKey(tenantId, organizationId) });
			}
		},
		[organizationId, queryClient, tenantId]
	);

	/** The status once the run is gone: read again, or else the one shown when the discard was sent, stopped. */
	const statusAfterDiscard = useCallback(
		async (shownBefore: ITimerStatus): Promise<ITimerStatus> => {
			try {
				const { data, response } = await getTimerStatusRequest({ tenantId, organizationId }, authToken ?? '');
				if (response.ok && data) {
					return data;
				}
			} catch {
				// The run is discarded: the timer reads stopped until its status is read again
			}
			return { ...shownBefore, running: false };
		},
		[authToken, organizationId, tenantId]
	);

	/**
	 * Discards the run `timeLogId`, the one the confirmation was opened for. The API refuses it (409) when
	 * another run is the running one by then.
	 */
	const discard = useCallback(
		async (timeLogId: string | undefined): Promise<boolean> => {
			if (discarding) {
				return false;
			}
			// A confirmation that named no run discards nothing: the running one now may be another the person never saw
			if (!timeLogId) {
				tellFailure('CHANGED');
				return false;
			}
			setDiscarding(true);
			try {
				let answer: Awaited<ReturnType<typeof discardTimerRequest>>;
				try {
					answer = await discardTimerRequest({ timeLogId, tenantId, organizationId }, authToken ?? '');
				} catch {
					tellFailure('OFFLINE');
					return false;
				}
				const { data, response } = answer;
				if (!response.ok) {
					const refusal = (data ?? {}) as IApiRefusal;
					const failure = timerDiscardFailureOf({ status: response.status, code: refusal.code });
					tellFailure(failure);
					readAgainAfter(failure);
					return false;
				}
				const status = await statusAfterDiscard(timerStatus);
				// The screen may show another run by then (started on another device): it is not replaced by a status of
				// the discarded one, and the timer is read again instead
				const stillShowsDiscardedRun = timerStore.timerStatus?.lastLog?.id === timeLogId;
				if (stillShowsDiscardedRun) {
					// The timer's read holds it too, and is not sent again now: a read sent before the discard is
					// dropped, and one sent now, before the screen shows the timer stopped, would sync a time slot of
					// the run that is gone. The timer's next poll reads it again
					void queryClient.cancelQueries({ queryKey: TIMER_STATUS_QUERY_KEY });
					queryClient.setQueryData(TIMER_STATUS_QUERY_KEY, status);
					setTimerStatus(status);
				} else {
					void queryClient.invalidateQueries({ queryKey: TIMER_STATUS_QUERY_KEY });
				}
				readAgainAfter('DISCARDED');
				showMessage({
					message: translate('timer.discard.discarded'),
					description: translate('timer.discard.discardedHint'),
					type: 'success'
				});
				return true;
			} finally {
				setDiscarding(false);
			}
		},
		[
			authToken,
			discarding,
			organizationId,
			queryClient,
			readAgainAfter,
			setTimerStatus,
			statusAfterDiscard,
			tenantId,
			timerStatus,
			timerStore
		]
	);

	return {
		availability,
		discard,
		discarding,
		/** The running run, for a confirmation to name it when it opens. */
		runningLogId: runningLog?.id,
		/** Where the run was started, when it stops elsewhere too; null for a run of the mobile app. */
		sourceKey: discardSourceKeyOf(runningLog?.source)
	};
}
