import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { globalQueryClient } from '@/core/query/config';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';

let isHandling401 = false;

// Callback to attempt token refresh when 401 occurs
let refreshTokenCallback: (() => Promise<any>) | null = null;

/**
 * Register a callback to attempt token refresh when 401 occurs
 * This is called by useAuthenticateUser hook to enable automatic recovery
 */
export function registerRefreshTokenCallback(callback: () => Promise<any>) {
	refreshTokenCallback = callback;
}

/**
 * Unregister the refresh token callback
 */
export function unregisterRefreshTokenCallback() {
	refreshTokenCallback = null;
}

/**
 * Centralized handler for 401 Unauthorized errors
 *
 * NEW STRATEGY (no timeout):
 * 1. If 401 + callback registered → Try refresh immediately
 * 2. If refresh succeeds → Do nothing (user stays logged in)
 * 3. If refresh fails → Disconnect user
 *
 * This prevents the race condition where timeout redirects user even if refresh succeeds.
 *
 * @param reason - The reason for the unauthorized error (default: UNAUTHORIZED_401)
 * @param details - Additional details about the error
 */
export async function handleUnauthorized(
	reason: DisconnectionReason = DisconnectionReason.UNAUTHORIZED_401,
	details?: Record<string, any>
) {
	// Prevent multiple simultaneous 401 handlers
	if (isHandling401) {
		console.warn('[Auth] Already handling 401, ignoring duplicate call');
		return;
	}

	isHandling401 = true;

	try {
		// Attempt token refresh immediately if callback is registered
		if (reason === DisconnectionReason.UNAUTHORIZED_401 && refreshTokenCallback) {
			console.log('[Auth] Attempting automatic token refresh on 401...');
			try {
				await refreshTokenCallback();
				console.log('[Auth] Token refresh succeeded, user stays logged in');
				// Success! User stays logged in, no redirect
				return;
			} catch (error) {
				console.log('[Auth] ❌ Token refresh failed, proceeding with logout:', error);
				// Refresh failed, continue to logout below
			}
		} else if (reason === DisconnectionReason.UNAUTHORIZED_401) {
			console.warn('[Auth] No refresh callback registered, proceeding with logout');
		}

		// If we reach here, we need to disconnect the user
		await performLogout(reason, details);
	} finally {
		isHandling401 = false;
	}
}

/**
 * Perform the actual logout (clear cookies, cache, redirect)
 */
async function performLogout(reason: DisconnectionReason, details?: Record<string, any>) {
	// Log the disconnection
	logDisconnection(reason, details);

	// 1. Clear all authentication cookies
	removeAuthCookies();

	// 2. Clear React Query cache (if available)
	if (globalQueryClient) {
		try {
			globalQueryClient.clear();
		} catch (error) {
			console.warn('[Auth] Failed to clear queryClient:', error);
		}
	}

	// 3. Clear localStorage (if used for auth state)
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem('auth-state');
			localStorage.removeItem('user-data');
		} catch (error) {
			console.warn('[Auth] Failed to clear localStorage:', error);
		}
	}

	// 4. Redirect to login page
	window.location.assign(DEFAULT_APP_PATH);
}

/**
 * Reset the handler flag (for testing purposes)
 * This should only be used in tests
 */
export function resetUnauthorizedHandler() {
	isHandling401 = false;
}
