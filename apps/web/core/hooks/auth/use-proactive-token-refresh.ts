'use client';

import { useEffect, useRef } from 'react';
import { getRefreshTokenCookie, getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import {
	shouldRefreshToken,
	getTokenRemainingTime,
	getTokenLifetime,
	getTokenRenewalTime,
	formatRemainingTime
} from '@/core/lib/auth/jwt-utils';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { isSessionOver, renewSession } from '@/core/lib/auth/session-renewal';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { retryWithBackoff } from '@/core/lib/auth/retry-logic';
import { logErrorInDev, logInDev } from '@/core/lib/helpers/error-message';
import { INIT_DELAY_MS } from '@/core/constants/config/constants';
import { usePathname } from 'next/navigation';

/**
 * How often the token is looked at: a tenth of its lifetime, within these bounds. A look reads the cookie and
 * compares two times: no request leaves unless a renewal is due.
 */
const MAX_CHECK_INTERVAL_MS = 60_000;
const MIN_CHECK_INTERVAL_MS = 5_000;

/**
 * At least a quarter of the token's lifetime, within these bounds, separates two renewals ahead of time. A computer
 * clock running far ahead makes every new token look due: without it, each look would renew.
 */
const MAX_RENEWAL_GAP_MS = 10 * 60_000;
const MIN_RENEWAL_GAP_MS = 30_000;

/** A renewal that could not be made is not asked again sooner than this. */
const ATTEMPT_GAP_MS = 10_000;

function within(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(value, maximum));
}

/** The token's lifetime in milliseconds, or null when it cannot be read. */
function lifetimeOf(accessToken: string | null): number | null {
	const lifetimeSeconds = accessToken ? getTokenLifetime(accessToken) : null;
	return lifetimeSeconds ? lifetimeSeconds * 1000 : null;
}

function checkIntervalOf(accessToken: string | null): number {
	const lifetime = lifetimeOf(accessToken);
	return lifetime ? within(lifetime / 10, MIN_CHECK_INTERVAL_MS, MAX_CHECK_INTERVAL_MS) : MAX_CHECK_INTERVAL_MS;
}

function renewalGapOf(accessToken: string | null): number {
	const lifetime = lifetimeOf(accessToken);
	return lifetime ? within(lifetime / 4, MIN_RENEWAL_GAP_MS, MAX_RENEWAL_GAP_MS) : MIN_RENEWAL_GAP_MS;
}

/**
 * Whether the renewal ahead of time is due: the token is past half of its lifetime, counted from the time it was
 * issued, or it expires within five minutes. A session left with its refresh token alone is due too.
 */
function isRenewalDue(accessToken: string | null): boolean {
	if (!accessToken) return true;
	const renewalTime = getTokenRenewalTime(accessToken);
	return renewalTime === null || Date.now() >= renewalTime || shouldRefreshToken(accessToken, 300);
}

/**
 * Hook for proactive token refresh
 *
 * KEY PRINCIPLE:
 * - Refresh at 50% of token lifetime (e.g., 12h for 24h token), so that no request leaves with an expired token
 * - The 50% point is the TOKEN's: its issue time plus half of its lifetime. It does not move with page changes, and a
 *   token already past it is renewed at once
 * - Avoid unnecessary API calls if token was refreshed elsewhere (another tab, proxy.ts): the token is read again at
 *   each look, and a fresh one is not due
 *
 * Strategy:
 * 1. Look at the token on mount and on each page change, then about once a minute (recursive setTimeout)
 * 2. At each look: renew only if the token is due
 * 3. Use retry logic with exponential backoff for network errors, and try again at the next look for as long as
 *    there is a refresh token: a failure never ends the schedule
 * 4. Force logout on 401 errors (refresh token invalid)
 *
 * Why looking every minute instead of one long timer?
 * - A timer planned for twelve hours later does not fire while the computer sleeps, and resumes late on some systems
 * - The look is a cookie read: it costs nothing, and it sees a token another tab renewed
 *
 */
export function useProactiveTokenRefresh() {
	const pathname = usePathname();
	// Use number type for browser setTimeout (not NodeJS.Timeout)
	const timeoutRef = useRef<number | null>(null);
	const isRefreshingRef = useRef(false);
	// When this tab last renewed ahead of time, and when it last tried: kept across page changes
	const lastRenewalAtRef = useRef(0);
	const lastAttemptAtRef = useRef(0);

	useEffect(() => {
		let active = true;

		/**
		 * Perform token refresh ONLY if needed
		 * Returns true if refresh was performed, false if skipped
		 */
		const performRefreshIfNeeded = async (): Promise<boolean> => {
			if (!active) return false;

			// Prevent concurrent refresh attempts
			if (isRefreshingRef.current) {
				logInDev('[ProactiveTokenRefresh] Refresh already in progress, skipping');
				return false;
			}

			const accessToken = getAccessTokenCookie();
			const refresh_token = getRefreshTokenCookie();

			if (!refresh_token) {
				logInDev('[ProactiveTokenRefresh] No refresh token available, skipping');
				return false;
			}

			// KEY CHECK: Only refresh once the token is past 50% of its lifetime (or about to expire)
			if (!isRenewalDue(accessToken)) {
				const remaining = formatRemainingTime(getTokenRemainingTime(accessToken ?? ''));
				logInDev(`[ProactiveTokenRefresh] Token still valid (${remaining} remaining), skipping refresh`);
				return false;
			}

			const now = Date.now();
			const isTooSoon =
				now - lastAttemptAtRef.current < ATTEMPT_GAP_MS ||
				now - lastRenewalAtRef.current < renewalGapOf(accessToken);
			if (isTooSoon) {
				return false;
			}

			lastAttemptAtRef.current = now;
			isRefreshingRef.current = true;

			try {
				logInDev('[ProactiveTokenRefresh] Token expired/expiring, refreshing now...');

				// The browser's one renewal (session-renewal.ts): shared with a request the API refused, and made one
				// tab at a time. It keeps the new pair itself, whatever becomes of this page meanwhile: the pair of a
				// renewal still under way when the page changed used to be dropped, with the only refresh token Gauzy
				// would accept next. A renewal that cannot be made is tried again with exponential backoff.
				const renewal = await retryWithBackoff(
					async () => {
						const attempt = await renewSession();
						if (attempt.outcome === 'unavailable') {
							throw attempt.error ?? new Error('The session could not be renewed now');
						}
						return attempt;
					},
					3,
					1000
				);

				if (renewal.outcome === 'ended') {
					// Without a refresh token there is no session to end here: the person signed out in another tab.
					// And a session whose refresh token was lost to a rotation works until its access token
					// expires (isSessionOver): it is not ended ahead of time.
					if (renewal.hadRefreshToken && isSessionOver(renewal)) {
						const details = { source: 'useProactiveTokenRefresh' };
						logErrorInDev(
							'[ProactiveTokenRefresh] ❌ Refresh token rejected (401) - forcing logout',
							details
						);
						// Refresh token is invalid → force logout immediately
						// This is critical: don't let the app hang with invalid tokens
						handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, details);
					}
					return false;
				}

				lastRenewalAtRef.current = Date.now();
				// Log success with next check timing
				const newRemaining = getTokenRemainingTime(getAccessTokenCookie() ?? '');
				logInDev(
					`[ProactiveTokenRefresh] ✅ Token refreshed! New expiration in ${formatRemainingTime(newRemaining)}`
				);
				return true;
			} catch (error) {
				// Network error - will be retried at the next look
				logErrorInDev('[ProactiveTokenRefresh] ❌ Token refresh failed (network error)', {
					source: 'useProactiveTokenRefresh',
					error: String(error)
				});
				return false;
			} finally {
				isRefreshingRef.current = false;
			}
		};

		/**
		 * Schedule the next look using recursive setTimeout
		 * This ensures the interval follows the CURRENT token after each refresh
		 */
		const scheduleNextCheck = () => {
			if (!active) return;

			const currentToken = getAccessTokenCookie();
			if (!currentToken) {
				logInDev('[ProactiveTokenRefresh] No access token, stopping scheduler');
				return;
			}

			// A look at the token costs nothing, so the schedule goes on for as long as the session has a token: an
			// expired one, or a renewal that failed during an outage, no longer ends it
			const interval = checkIntervalOf(currentToken);
			timeoutRef.current =
				typeof window !== 'undefined'
					? window.setTimeout(async () => {
							if (!active) return;
							await performRefreshIfNeeded();
							if (!active) return;
							// Always reschedule (whether refresh happened or was skipped)
							scheduleNextCheck();
						}, interval)
					: null;
		};

		/**
		 * Initial setup: check if a refresh is due, then start the scheduler
		 */
		const setupRefreshSchedule = async () => {
			if (!active) return;

			if (!getAccessTokenCookie()) {
				logInDev('[ProactiveTokenRefresh] No access token, waiting for login');
				return;
			}

			await performRefreshIfNeeded();
			if (!active) return;
			scheduleNextCheck();
		};

		// Initial setup after a short delay to let app fully initialize
		// WHY 2 SECONDS? This hook mounts in app/layout.tsx (root layout), which means:
		// 1. Cookies may not be fully parsed yet during React hydration
		// 2. QueryClient and other providers may not be initialized
		// 3. Other auth hooks (useAuthenticateUser) may not be ready
		// Without this delay, getAccessTokenCookie() could return undefined
		// causing unnecessary "no token" logs or race conditions.
		// 2s is conservative - could be reduced but adds safety margin.
		const initialTimeout = setTimeout(() => {
			if (active) void setupRefreshSchedule();
		}, INIT_DELAY_MS);

		// Cleanup function
		return () => {
			active = false;
			if (timeoutRef.current) {
				window?.clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			clearTimeout(initialTimeout);
		};
	}, [pathname]);
}
