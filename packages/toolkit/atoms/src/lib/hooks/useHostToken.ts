'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { accessTokenAtom } from '../teams-jotai/atoms/teams-atoms';
import { kitNoticeAtom } from '@lib/errors/kit-notice-atom';
import { hostSessionAtom } from '@lib/session/host-session';
import {
	expiryOf,
	GetKitToken,
	MIN_REFRESH_DELAY_MS,
	MIN_TOKEN_LIFE_MS,
	organizationOfToken,
	ownerOfToken,
	refreshDelayMs
} from '@lib/session/host-token';
import { warnOnce } from '@lib/utils/warn-once';
import { useClearKitSession } from './useClearKitSession';

// The console warning of a failed call: its key (one warning per key and page) and its text; null for none.
export type TokenFailureWarning = (error: unknown) => { key: string; message: string } | null;

const getTokenWarning: TokenFailureWarning = (error) => ({
	key: 'get-token-failed',
	message: `config.getToken failed (${(error as Error)?.message ?? error}): the widgets show the person as signed out.`
});

/**
 * Keeps the kit signed in through the host's `getToken`: a token at start, another shortly before it expires (or when
 * the page comes back after that time), and one more after the API refuses the token (401), once until a request
 * succeeds again. The token stays in memory: nothing is written to the browser's storage. One call at a time: a refresh
 * asked while one runs gets that one's answer. After a failed call, the next one waits for the page to come back
 * (focus or visible again), and never sooner than a few seconds after the failure.
 *
 * @param warningOf The console warning of a failed call: config.getToken's by default.
 * @returns A function that asks the host for a token now.
 */
export function useHostToken(
	getToken?: GetKitToken,
	warningOf: TokenFailureWarning = getTokenWarning
): () => Promise<void> {
	const setAccessToken = useSetAtom(accessTokenAtom);
	const setHostSession = useSetAtom(hostSessionAtom);
	const notice = useAtomValue(kitNoticeAtom);
	const clearSession = useClearKitSession();
	const enabled = Boolean(getToken);

	// The latest values for the callbacks below, which stay the same for the provider's life. Set once a render
	// commits, before the effects below run: a render React discards never reaches them.
	const latestGetToken = useRef(getToken);
	const latestClearSession = useRef(clearSession);
	const latestWarningOf = useRef(warningOf);
	useEffect(() => {
		latestGetToken.current = getToken;
		latestClearSession.current = clearSession;
		latestWarningOf.current = warningOf;
	});

	const pending = useRef<Promise<void> | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const refreshAt = useRef(0);
	const mounted = useRef(false);
	const retriedAfterRefusal = useRef(false);
	// Whose token the kit holds (the person and organization of its claims); null while signed out.
	const owner = useRef<string | null>(null);
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
			const now = Date.now();
			const expiresAt = expiryOf(answer.expiresAt);
			// A token with no readable expiry, or one that is past or seconds away, would be asked for again and again.
			if (expiresAt - now < MIN_TOKEN_LIFE_MS) {
				throw new Error('its expiresAt is missing, past or less than 10 seconds away (check the clocks)');
			}
			// Another person or organization (the host signed someone else in): nothing of the previous session is kept,
			// so the user and the employee are read again for the new token.
			const nextOwner = ownerOfToken(token);
			if (owner.current !== null && owner.current !== nextOwner) {
				latestClearSession.current();
			}
			owner.current = nextOwner;
			setAccessToken(token);
			setHostSession({ status: 'signed-in', organizationId: organizationOfToken(token) });
			const delay = refreshDelayMs(expiresAt, now);
			refreshAt.current = now + delay;
			timer.current = setTimeout(() => {
				void refreshRef.current();
			}, delay);
		} catch (error) {
			if (!mounted.current) {
				return;
			}
			const warning = latestWarningOf.current(error);
			if (warning) {
				warnOnce(warning.key, warning.message);
			}
			owner.current = null;
			latestClearSession.current();
			setHostSession({ status: 'signed-out', organizationId: null });
			// Asked again when the page comes back (the person may have signed in to the host meanwhile), not sooner.
			refreshAt.current = Date.now() + MIN_REFRESH_DELAY_MS;
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
	useEffect(() => {
		refreshRef.current = refresh;
	}, [refresh]);

	// A token at start. Under React's strict mode the effect runs twice; the second run gets the pending call's answer.
	// Leaving host sign-in (or the provider) drops the answer of a call still pending.
	useEffect(() => {
		if (!enabled) {
			return;
		}
		mounted.current = true;
		void refresh();
		return () => {
			mounted.current = false;
			clearTimeout(timer.current);
		};
	}, [enabled, refresh]);

	// A background tab may run the timer late: coming back after the refresh time asks at once. So does coming back
	// signed out, once the short wait after the failed call is over.
	useEffect(() => {
		if (!enabled) {
			return;
		}
		const refreshIfDue = () => {
			if (document.visibilityState === 'hidden') {
				return;
			}
			if (Date.now() >= refreshAt.current) {
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
