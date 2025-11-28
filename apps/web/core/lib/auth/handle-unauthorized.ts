import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { globalQueryClient } from '@/core/query/config';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
import { isUnauthorizedError, isRetryableError } from '@/core/lib/auth/retry-logic';

let isHandling401 = false;
let isRedirecting = false;

// Stack of callbacks to attempt token refresh when 401 occurs
// Using a Set to maintain multiple callbacks from different hook instances
// This prevents the race condition where unmounting one component clears the callback for others
const refreshTokenCallbacks: Set<() => Promise<unknown>> = new Set();

/**
 * Register a callback to attempt token refresh when 401 occurs
 * This is called by useAuthenticateUser hook to enable automatic recovery
 *
 * Multiple components can register callbacks simultaneously.
 * When a 401 occurs, we try each callback until one succeeds.
 *
 * @param callback - The refresh callback function
 * @returns A function to unregister this specific callback
 */
export function registerRefreshTokenCallback(callback: () => Promise<unknown>) {
	refreshTokenCallbacks.add(callback);

	// Return an unregister function that removes THIS specific callback
	return () => {
		refreshTokenCallbacks.delete(callback);
	};
}

/**
 * Centralized handler for 401 Unauthorized errors
 *
 * STRATEGY:
 * 1. Prevent multiple simultaneous handlers (avoid race conditions)
 * 2. If 401 + callback registered → Try refresh immediately
 * 3. Distinguish between 401 (token invalid) and network errors
 * 4. If refresh succeeds → User stays logged in
 * 5. If refresh fails with 401 → Disconnect user
 * 6. If refresh fails with network error → Log but don't disconnect immediately
 *
 * @param reason - The reason for the unauthorized error (default: UNAUTHORIZED_401)
 * @param details - Additional details about the error
 */
export async function handleUnauthorized(
	reason: DisconnectionReason = DisconnectionReason.UNAUTHORIZED_401,
	details?: Record<string, unknown>
) {
	// Prevent multiple simultaneous 401 handlers
	if (isHandling401 || isRedirecting) {
		console.warn('[Auth] Already handling 401, ignoring duplicate call');
		return;
	}

	isHandling401 = true;

	try {
		// Attempt token refresh immediately if callbacks are registered
		if (reason === DisconnectionReason.UNAUTHORIZED_401 && refreshTokenCallbacks.size > 0) {
			console.log(
				`[Auth] Attempting automatic token refresh on 401 (${refreshTokenCallbacks.size} callback(s) registered)...`
			);

			// Try each registered callback until one succeeds
			for (const callback of refreshTokenCallbacks) {
				try {
					await callback();
					console.log('[Auth] ✅ Token refresh succeeded, user stays logged in');
					// Success! User stays logged in, no redirect
					return;
				} catch (error) {
					// Distinguish between 401 and network errors
					if (isUnauthorizedError(error)) {
						console.log('[Auth] ⚠️ Token refresh returned 401 (refresh token invalid)');
						// Don't try more callbacks - the refresh token itself is invalid
						break;
					} else if (isRetryableError(error)) {
						console.log('[Auth] ⚠️ Token refresh failed (network error), trying next callback:', error);
						// Network error - try next callback
						continue;
					} else {
						console.log('[Auth] ⚠️ Token refresh failed (unknown error):', error);
						continue;
					}
				}
			}

			// All callbacks failed
			console.log('[Auth] ❌ All token refresh attempts failed, proceeding with logout');
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
async function performLogout(reason: DisconnectionReason, details?: Record<string, unknown>) {
	if (isRedirecting) return; // Prevent multiple simultaneous redirects
	isRedirecting = true;
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
		// 4. Redirect to login page
		window?.location.assign(DEFAULT_APP_PATH);
	}
}

/**
 * Reset the handler flag (for testing purposes)
 * This should only be used in tests
 */
export function resetUnauthorizedHandler() {
	isHandling401 = false;
	isRedirecting = false;
	refreshTokenCallbacks.clear();
}
