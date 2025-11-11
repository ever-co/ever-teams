'use client';

import { useEffect, useRef } from 'react';
import { getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { refreshTokenRequest } from '@/core/services/server/requests/auth';
import { setAccessTokenCookie } from '@/core/lib/helpers/cookies';

/**
 * Hook for proactive token refresh
 * 
 * This hook implements a workaround for the Ever-Gauzy bug where refresh tokens
 * are not rotated. It proactively refreshes the access token every 12 hours
 * to keep the session alive indefinitely.
 * 
 * BUG CONTEXT:
 * - Ever-Gauzy's getAccessTokenFromRefreshToken() only returns { token }
 * - It doesn't return the new refresh_token
 * - This means refresh tokens are never rotated
 * - After 7 days (JWT_REFRESH_TOKEN_EXPIRATION_TIME), user is disconnected
 * 
 * WORKAROUND:
 * - Refresh the access token every 12 hours
 * - This keeps the refresh_token "alive" even though it's not rotated
 * - User stays logged in indefinitely (as long as they use the app)
 * 
 * TODO: Remove this hook once Ever-Gauzy is fixed
 */
export function useProactiveTokenRefresh() {
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const isRefreshingRef = useRef(false);

	useEffect(() => {
		const performRefresh = async () => {
			// Prevent concurrent refresh attempts
			if (isRefreshingRef.current) {
				console.log('[ProactiveTokenRefresh] Refresh already in progress, skipping');
				return;
			}

			isRefreshingRef.current = true;

			try {
				const refresh_token = getRefreshTokenCookie();

				if (!refresh_token) {
					console.log('[ProactiveTokenRefresh] No refresh token available, skipping');
					isRefreshingRef.current = false;
					return;
				}

				console.log('[ProactiveTokenRefresh] Starting proactive token refresh...');

				const { data } = await refreshTokenRequest(refresh_token);

				if (!data?.token) {
					console.error('[ProactiveTokenRefresh] No token received from refresh endpoint');
					isRefreshingRef.current = false;
					return;
				}

				// Update the access token cookie
				setAccessTokenCookie(data.token);

				console.log('[ProactiveTokenRefresh] ✅ Token refreshed successfully');
				console.log('[ProactiveTokenRefresh] Next refresh scheduled in 12 hours');
			} catch (error) {
				console.error('[ProactiveTokenRefresh] ❌ Token refresh failed:', error);
				// Don't throw - let the user continue, they'll be refreshed on next request
			} finally {
				isRefreshingRef.current = false;
			}
		};

		// Initial refresh after 1 minute (give app time to load)
		const initialTimeout = setTimeout(() => {
			performRefresh();
		}, 60 * 1000); // 1 minute

		// Then refresh every 12 hours
		intervalRef.current = setInterval(() => {
			performRefresh();
		}, 12 * 60 * 60 * 1000); // 12 hours

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			clearTimeout(initialTimeout);
		};
	}, []);
}

