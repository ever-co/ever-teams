'use client';

import { useStore } from 'jotai';
import { useEffect } from 'react';

import { witnessTimerAtSessionEnd } from '@/core/lib/auth/session-ended-notice';
import { isRunningTeamsLog } from '@/core/lib/helpers/timer-policy';
import { timerStatusState } from '@/core/stores';

/**
 * Lets the app say, as it ends the session by itself, whether the timer of this tab shows a run going on: that run
 * goes on in the API, and the sign-in page tells the person what becomes of it (session-ended-notice.tsx).
 *
 * Only a run of this app counts: the closed-tab rule, which the notice describes, leaves another app's run alone
 * (isStaleTeamsTimer). The status is read as the session ends, not subscribed to: the tab's timer owner must not
 * render again for it.
 */
export function useTimerSessionEndWitness(): void {
	const store = useStore();

	useEffect(
		() =>
			witnessTimerAtSessionEnd(() => {
				const status = store.get(timerStatusState);
				const run = status?.lastLog;
				if (!status?.running || !isRunningTeamsLog(run)) {
					return null;
				}
				const startedAt = new Date(run.startedAt ?? Number.NaN).getTime();
				const lastHeartbeat = new Date(run.stoppedAt ?? Number.NaN).getTime();
				// A run is written with its end at its start: only a heartbeat moves it
				const hasHadHeartbeat = !Number.isNaN(lastHeartbeat) && !(lastHeartbeat <= startedAt);
				return { savedUntil: hasHadHeartbeat ? new Date(lastHeartbeat).toISOString() : null };
			}),
		[store]
	);
}
