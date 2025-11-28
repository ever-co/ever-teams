'use client';

import { useEffect, useRef } from 'react';
import { getRefreshTokenCookie, getAccessTokenCookie, setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { refreshTokenRequest } from '@/core/services/server/requests/auth';
import {
	shouldRefreshToken,
	getTokenRemainingTime,
	formatRemainingTime,
	calculateRefreshInterval
} from '@/core/lib/auth/jwt-utils';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { retryWithBackoff, isUnauthorizedError } from '@/core/lib/auth/retry-logic';

/**
 * Hook for proactive token refresh
 *
 * KEY PRINCIPLE:
 * - ONLY refresh if token is expired or expiring soon
 * - NEVER refresh if token is still valid (avoid unnecessary API calls)
 *
 * Strategy:
 * 1. On mount: Check shouldRefreshToken() → only refresh if needed
 * 2. Set interval to check periodically (12h for 24h token)
 * 3. At each interval: Check shouldRefreshToken() BEFORE making API call
 * 4. Use retry logic for network errors, but NOT for 401 errors
 *
 */
export function useProactiveTokenRefresh() {
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
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

			// KEY CHECK: Only refresh if token is expiring soon (within 5 min)
			if (accessToken && !shouldRefreshToken(accessToken, 300)) {
				const remaining = getTokenRemainingTime(accessToken);
				console.log(`[ProactiveTokenRefresh] Token still valid (${formatRemainingTime(remaining)} remaining), skipping refresh`);
				return false;
			}

			isRefreshingRef.current = true;

			try {
				console.log('[ProactiveTokenRefresh] Token expired/expiring, refreshing now...');

				// Use retry logic with exponential backoff for network errors
				const { data } = await retryWithBackoff(() => refreshTokenRequest(refresh_token), 3, 1000);

				if (!data?.token) {
					console.error('[ProactiveTokenRefresh] No token received from refresh endpoint');
					return false;
				}

				// Update the access token cookie
				setAccessTokenCookie(data.token);

				// Log success with next check timing
				const newRemaining = getTokenRemainingTime(data.token);
				console.log(`[ProactiveTokenRefresh] ✅ Token refreshed! New expiration in ${formatRemainingTime(newRemaining)}`);
				return true;
			} catch (error) {
				// Distinguish between 401 (session invalid) and network errors
				if (isUnauthorizedError(error)) {
					console.error('[ProactiveTokenRefresh] ❌ Refresh token rejected (401) - forcing logout');
					// Refresh token is invalid → force logout immediately
					// This is critical: don't let the app hang with invalid tokens
					handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED, {
						source: 'useProactiveTokenRefresh',
						error: String(error)
					});
				} else {
					console.error('[ProactiveTokenRefresh] ❌ Token refresh failed (network error):', error);
					// Network error - will be retried on next interval
				}
				return false;
			} finally {
				isRefreshingRef.current = false;
			}
		};

		/**
		 * Setup the refresh schedule based on token lifetime
		 */
		const setupRefreshSchedule = () => {
			const accessToken = getAccessTokenCookie();

			if (!accessToken) {
				console.log('[ProactiveTokenRefresh] No access token, waiting for login');
				return;
			}

			// Check if we need to refresh immediately
			if (shouldRefreshToken(accessToken, 300)) {
				console.log('[ProactiveTokenRefresh] Token needs refresh, doing it now...');
				performRefreshIfNeeded();
			} else {
				const remainingTime = getTokenRemainingTime(accessToken);
				console.log(`[ProactiveTokenRefresh] Token valid, remaining: ${formatRemainingTime(remainingTime)}`);
			}

			// Set up periodic check (at 50% of token lifetime)
			// The check will ONLY call API if token is actually expiring
			const interval = calculateRefreshInterval(accessToken);
			console.log(`[ProactiveTokenRefresh] Setting check interval: ${formatRemainingTime(interval / 1000)}`);

			intervalRef.current = setInterval(() => {
				console.log('[ProactiveTokenRefresh] Periodic check triggered...');
				performRefreshIfNeeded(); // Will only refresh if needed
			}, interval);
		};

		// Initial setup after a short delay to let app initialize
		const initialTimeout = setTimeout(() => {
			setupRefreshSchedule();
		}, 2000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			clearTimeout(initialTimeout);
		};
	}, []);
}
