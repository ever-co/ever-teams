import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { globalQueryClient } from '@/core/query/config';

let isRedirecting = false;
let redirectTimeout: NodeJS.Timeout | null = null;

/**
 * Centralized handler for 401 Unauthorized errors
 * Prevents multiple simultaneous redirects and ensures clean logout
 *
 * This handler solves the critical bug where 3 different 401 handlers
 * (proxy.ts, axios.ts, api.service.ts) were creating race conditions
 * and causing infinite login/logout loops.
 *
 */
export function handleUnauthorized() {
	// Always clear any existing timeout to ensure the latest call controls the timing
	if (redirectTimeout) {
		clearTimeout(redirectTimeout);
		redirectTimeout = null;
	}

	// Prevent multiple simultaneous redirects
	if (isRedirecting) {
		console.warn('[Auth] Redirect already in progress, resetting timeout for latest call');
		// Don't return - allow updating the timeout for better timing control
	} else {
		isRedirecting = true;
	}

	// Debounce redirects (600ms timeout)
	// This prevents race conditions when multiple 401 errors occur simultaneously
	// The 600ms window allows refreshUserData() to attempt token refresh before logout
	// This enables "optimistic recovery" for user-initiated actions (startTimer, emailReset, etc.)

	redirectTimeout = setTimeout(() => {
		console.log('[Auth] Handling 401 Unauthorized - Logging out user');

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

		// Reset flag after redirect (for safety, though page will reload)
		isRedirecting = false;
	}, 600); // Increased from 120ms to 600ms to allow token refresh to complete (network RTT + processing)
}

/**
 * Cancel the pending logout if token refresh succeeds
 * This allows refreshUserData() to attempt token refresh before logout
 *
 * IMPORTANT: Only call this if you've successfully refreshed the token
 * and want to prevent the user from being logged out
 */
export function cancelPendingLogout() {
	if (redirectTimeout) {
		console.log('[Auth] Token refresh succeeded, canceling pending logout');
		clearTimeout(redirectTimeout);
		redirectTimeout = null;
	}
	isRedirecting = false;
}

/**
 * Reset the redirect flag (for testing purposes)
 * This should only be used in tests
 */
export function resetUnauthorizedHandler() {
	isRedirecting = false;
	if (redirectTimeout) {
		clearTimeout(redirectTimeout);
		redirectTimeout = null;
	}
}
