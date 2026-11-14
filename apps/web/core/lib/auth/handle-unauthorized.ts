import { removeAuthCookies } from '@/core/lib/helpers/cookies';
import { unsubscribeThisBrowserPush } from '@/core/lib/utils/web-push';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { globalQueryClient } from '@/core/query/config';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { logDisconnection } from '@/core/lib/auth/disconnect-logger';
import { isPasswordRecoveryPage } from '@/core/lib/auth/signed-in-auth-paths';
import { runSignOutCleanups } from '@/core/lib/auth/sign-out-cleanups';
import { clearSessionEndedNotice, leaveSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';

let isRedirecting = false;

/**
 * Ends the session in this browser and sends the person to the sign-in page.
 *
 * A session ends here when it cannot go on: the API refuses the refresh token, or there is none left
 * (session-renewal.ts answers `ended`). A request the API refused with 401 does not end it by itself: api.service.ts
 * renews the session first and sends the request again, and a renewal that could not be made (no network, a server
 * error) keeps the session.
 *
 * @param reason - Why the session ends, for the disconnection log
 * @param details - Additional details about the error
 */
export async function handleUnauthorized(
	reason: DisconnectionReason = DisconnectionReason.UNAUTHORIZED_401,
	details?: Record<string, unknown>
) {
	await performLogout(reason, details);
}

/**
 * Whether the app is ending the session in this tab: the sign-out has begun and the page is leaving for the sign-in
 * page. A request that fails then failed with the session, not for a reason of its own.
 */
export function isSessionEnding(): boolean {
	return isRedirecting;
}

/**
 * Perform the actual logout (clear cookies, cache, redirect)
 */
async function performLogout(reason: DisconnectionReason, details?: Record<string, unknown>) {
	if (isRedirecting) return; // Prevent multiple simultaneous redirects
	isRedirecting = true;
	// Log the disconnection
	logDisconnection(reason, details);
	// The person did not ask for this sign-out: the sign-in page they are sent to says why they are on it
	leaveSessionEndedNotice();

	// 1. Clear all authentication cookies, and what the features keep of the person in memory (unsaved Docs text)
	removeAuthCookies();
	runSignOutCleanups();
	// The session ended: this browser stops receiving the person's inbox notifications (the push service then refuses
	// the platform's next push, and the platform drops the device). Fire and forget.
	void unsubscribeThisBrowserPush();

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
		// 4. Redirect to login page, except from a password recovery page: an old session still in the browser that
		// opens a reset link ends here, and leaving the page would lose the link
		if (isPasswordRecoveryPage(window.location.pathname)) {
			// No sign-in page follows: the note left for it goes too
			clearSessionEndedNotice();
			isRedirecting = false;
			return;
		}
		window?.location.assign(DEFAULT_APP_PATH);
	}
}

/**
 * Reset the handler flag (for testing purposes)
 * This should only be used in tests
 */
export function resetUnauthorizedHandler() {
	isRedirecting = false;
}
