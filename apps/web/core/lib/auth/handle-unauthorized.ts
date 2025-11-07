import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

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
 * @see apps/web/ai-guides/JIRA-AUTH-CRITICAL-BUG.md for full context
 */
export function handleUnauthorized() {
	// Prevent multiple simultaneous redirects
	if (isRedirecting) {
		console.warn('[Auth] Redirect already in progress, ignoring duplicate 401');
		return;
	}

	isRedirecting = true;

	// Debounce redirects (100ms timeout)
	// This prevents race conditions when multiple 401 errors occur simultaneously
	if (redirectTimeout) {
		clearTimeout(redirectTimeout);
	}

	redirectTimeout = setTimeout(() => {
		console.log('[Auth] Handling 401 Unauthorized - Logging out user');

		// 1. Clear all authentication cookies
		removeAuthCookies();

		// 2. Clear React Query cache (if available)
		if (typeof window !== 'undefined' && (window as any).queryClient) {
			try {
				(window as any).queryClient.clear();
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
	}, 100);
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

