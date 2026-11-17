'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { accessTokenAtom } from '../teams-jotai/atoms/teams-atoms';
import { kitNoticeAtom } from '@lib/errors/kit-notice-atom';
import { hostSessionAtom } from '@lib/session/host-session';
import { expiryOf, GetKitToken, organizationOfToken, refreshDelayMs } from '@lib/session/host-token';
import { warnOnce } from '@lib/utils/warn-once';
import { useClearKitSession } from './useClearKitSession';

/**
 * Keeps the kit signed in through the host's `getToken`: a token at start, another shortly before it expires (or when
 * the page comes back after that time), and one more after the API refuses the token (401), once until a request
 * succeeds again. The token stays in memory: nothing is written to the browser's storage. One call at a time: a refresh
 * asked while one runs gets that one's answer.
 *
 * @returns A function that asks the host for a token now.
 */
export function useHostToken(getToken?: GetKitToken): () => Promise<void> {
	const setAccessToken = useSetAtom(accessTokenAtom);
	const setHostSession = useSetAtom(hostSessionAtom);
	const notice = useAtomValue(kitNoticeAtom);
	const clearSession = useClearKitSession();
	const enabled = Boolean(getToken);

	// The latest values for the callbacks below, which stay the same for the provider's life.
	const latestGetToken = useRef(getToken);
	latestGetToken.current = getToken;
	const latestClearSession = useRef(clearSession);
	latestClearSession.current = clearSession;

	const pending = useRef<Promise<void> | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const refreshAt = useRef(0);
	const mounted = useRef(false);
	const retriedAfterRefusal = useRef(false);
	const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve());

	const ask = async () => {
		const getHostToken = latestGetToken.current;
		if (!getHostToken) {
			return;
		}
		try {
			const answer = await getHostToken();
			if (!mounted.current) {
				return;
			}
			const token = answer?.token;
			if (!token) {
				throw new Error('it resolved without a token');
			}
			setAccessToken(token);
			setHostSession({ status: 'signed-in', organizationId: organizationOfToken(token) });
			const delay = refreshDelayMs(expiryOf(answer.expiresAt), Date.now());
			refreshAt.current = Date.now() + delay;
			timer.current = setTimeout(() => {
				void refreshRef.current();
			}, delay);
		} catch (error) {
			if (!mounted.current) {
				return;
			}
			warnOnce(
				'get-token-failed',
				`config.getToken failed (${(error as Error)?.message ?? error}): the widgets show the person as signed out.`
			);
			latestClearSession.current();
			setHostSession({ status: 'signed-out', organizationId: null });
		}
	};

	const refresh = useCallback((): Promise<void> => {
		if (pending.current) {
			return pending.current;
		}
		clearTimeout(timer.current);
		const run = ask().finally(() => {
			pending.current = null;
		});
		pending.current = run;
		return run;
	}, []);
	refreshRef.current = refresh;

	// A token at start. Under React's strict mode the effect runs twice; the second run gets the pending call's answer.
	useEffect(() => {
		mounted.current = true;
		if (!enabled) {
			return;
		}
		void refresh();
		return () => {
			mounted.current = false;
			clearTimeout(timer.current);
		};
	}, [enabled, refresh]);

	// A background tab may run the timer late: coming back after the refresh time asks at once.
	useEffect(() => {
		if (!enabled) {
			return;
		}
		const refreshIfDue = () => {
			if (document.visibilityState === 'hidden') {
				return;
			}
			const due = refreshAt.current > 0 && Date.now() >= refreshAt.current;
			if (due) {
				void refresh();
			}
		};
		document.addEventListener('visibilitychange', refreshIfDue);
		window.addEventListener('focus', refreshIfDue);
		return () => {
			document.removeEventListener('visibilitychange', refreshIfDue);
			window.removeEventListener('focus', refreshIfDue);
		};
	}, [enabled, refresh]);

	// The API refused the token (the widgets say the session ended): one new token, not one per refused request.
	useEffect(() => {
		if (!enabled) {
			return;
		}
		if (!notice) {
			retriedAfterRefusal.current = false;
			return;
		}
		const refused = notice.kind === 'session';
		if (!refused || retriedAfterRefusal.current) {
			return;
		}
		retriedAfterRefusal.current = true;
		void refresh();
	}, [enabled, notice, refresh]);

	return refresh;
}
