'use client';

import { useEffect, useRef } from 'react';
import { getRefreshTokenCookie, getAccessTokenCookie, setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { refreshTokenRequest } from '@/core/services/server/requests/auth';
import {
	shouldRefreshToken,
	getTokenRemainingTime,
	getTokenLifetime,
	formatRemainingTime,
	calculateRefreshInterval
} from '@/core/lib/auth/jwt-utils';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { retryWithBackoff, isUnauthorizedError } from '@/core/lib/auth/retry-logic';
import { logErrorInDev } from '@/core/lib/helpers/error-message';

/**
 * Hook for proactive token refresh
 *
 * KEY PRINCIPLE:
 * - Refresh at 50% of token lifetime (e.g., 12h for 24h token)
 * - ONLY refresh if token has ≤50% of its lifetime remaining
 * - Avoid unnecessary API calls if token was refreshed elsewhere (e.g., proxy.ts)
 *
 * Strategy:
 * 1. On mount: Check if token expires within 5 min → immediate refresh if needed
 * 2. Use recursive setTimeout (not setInterval) to recalculate interval after each refresh
 * 3. At each timeout: Check if remaining time ≤ 50% lifetime before making API call
 * 4. Use retry logic with exponential backoff for network errors
 * 5. Force logout immediately on 401 errors (refresh token invalid)
 *
 * Why recursive setTimeout instead of setInterval?
 * - The interval is recalculated based on the CURRENT token after each refresh
 * - Protects against race conditions when proxy.ts refreshes the token concurrently
 * - More resilient: if refresh fails, next attempt uses updated token state
 *
 */
export function useProactiveTokenRefresh() {
	// Use number type for browser setTimeout (not NodeJS.Timeout)
	const timeoutRef = useRef<number | null>(null);
	const isRefreshingRef = useRef(false);

	useEffect(() => {
		/**
		 * Perform token refresh ONLY if needed
		 * Returns true if refresh was performed, false if skipped
		 */
		const performRefreshIfNeeded = async (): Promise<boolean> => {
			// Prevent concurrent refresh attempts
			if (isRefreshingRef.current) {
				console.log('[ProactiveTokenRefresh] Refresh already in progress, skipping');
				return false;
			}

			const accessToken = getAccessTokenCookie();
			const refresh_token = getRefreshTokenCookie();

			if (!refresh_token) {
				console.log('[ProactiveTokenRefresh] No refresh token available, skipping');
				return false;
			}

			// KEY CHECK: Only refresh if token has less than 50% of its lifetime remaining
			// This is consistent with the 50% refresh strategy used in calculateRefreshInterval
			if (accessToken) {
				const remainingSeconds = getTokenRemainingTime(accessToken);
				const lifetimeSeconds = getTokenLifetime(accessToken);
				// Default to 12h (43200s) if lifetime can't be determined
				const halfLifeSeconds = lifetimeSeconds ? lifetimeSeconds / 2 : 12 * 60 * 60;

				if (remainingSeconds > halfLifeSeconds) {
					// Token has more than 50% life remaining - no need to refresh yet
					console.log(
						`[ProactiveTokenRefresh] Token still valid (${formatRemainingTime(remainingSeconds)} remaining > 50% lifetime), skipping refresh`
					);
					return false;
				}
			}

			isRefreshingRef.current = true;

			try {
				console.log('[ProactiveTokenRefresh] Token expired/expiring, refreshing now...');

				// Use retry logic with exponential backoff for network errors
				const { data } = await retryWithBackoff(() => refreshTokenRequest(refresh_token), 3, 1000);

				if (!data?.token) {
					logErrorInDev('[ProactiveTokenRefresh] No token received from refresh endpoint', data);
					return false;
				}

				// Update the access token cookie
				setAccessTokenCookie(data.token);

				// Log success with next check timing
				const newRemaining = getTokenRemainingTime(data.token);
				console.log(
					`[ProactiveTokenRefresh] ✅ Token refreshed! New expiration in ${formatRemainingTime(newRemaining)}`
				);
				return true;
			} catch (error) {
				const details = {
					source: 'useProactiveTokenRefresh',
					error: String(error)
				};
				// Distinguish between 401 (session invalid) and network errors
				if (isUnauthorizedError(error)) {
					logErrorInDev('[ProactiveTokenRefresh] ❌ Refresh token rejected (401) - forcing logout', details);
					// Refresh token is invalid → force logout immediately
					// This is critical: don't let the app hang with invalid tokens
					handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, details);
				} else {
					logErrorInDev('[ProactiveTokenRefresh] ❌ Token refresh failed (network error)', details);
					// Network error - will be retried on next interval
				}
				return false;
			} finally {
				isRefreshingRef.current = false;
			}
		};

		/**
		 * Schedule the next refresh using recursive setTimeout
		 * This ensures the interval is recalculated based on the CURRENT token after each refresh
		 */
		const scheduleNextRefresh = () => {
			const currentToken = getAccessTokenCookie();
			if (!currentToken) {
				console.log('[ProactiveTokenRefresh] No access token, stopping scheduler');
				return;
			}

			// Calculate optimal refresh interval based on CURRENT token
			const interval = calculateRefreshInterval(currentToken);
			const remainingTime = getTokenRemainingTime(currentToken);

			console.log(
				`[ProactiveTokenRefresh] Token remaining: ${formatRemainingTime(remainingTime)}, ` +
					`Next check in: ${formatRemainingTime(interval / 1000)}`
			);

			timeoutRef.current =
				window?.setTimeout(async () => {
					console.log('[ProactiveTokenRefresh] Scheduled check triggered...');
					await performRefreshIfNeeded();
					// Always reschedule (whether refresh happened or was skipped)
					// The interval will be recalculated based on the current token
					scheduleNextRefresh();
				}, interval) ?? null;
		};

		/**
		 * Initial setup: check if immediate refresh is needed, then start scheduler
		 */
		const setupRefreshSchedule = async() => {
			const accessToken = getAccessTokenCookie();

			if (!accessToken) {
				console.log('[ProactiveTokenRefresh] No access token, waiting for login');
				return;
			}

			// Check if we need to refresh immediately (token expiring within 5 min)
			if (shouldRefreshToken(accessToken, 300)) {
				console.log('[ProactiveTokenRefresh] Token needs refresh, doing it now...');
				await performRefreshIfNeeded();
			} else {
				const remainingTime = getTokenRemainingTime(accessToken);
				console.log(`[ProactiveTokenRefresh] Token valid, remaining: ${formatRemainingTime(remainingTime)}`);
			}

			// Start the recursive scheduler
			scheduleNextRefresh();
		};

		// Initial setup after a short delay to let app initialize
		const initialTimeout = setTimeout(() => {
			setupRefreshSchedule();
		}, 2000);

		// Cleanup function
		return () => {
			if (timeoutRef.current) {
				window?.clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			clearTimeout(initialTimeout);
		};
	}, []);
}
