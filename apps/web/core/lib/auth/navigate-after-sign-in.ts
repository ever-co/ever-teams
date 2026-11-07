/**
 * Opens the app once a sign-in has set the auth cookies, with a full page load.
 *
 * Not `router.push('/')`: while the visitor is still signed out, Next.js prefetches `/` and `proxy.ts` answers that
 * prefetch with a redirect to the sign-in page. The client router keeps that answer, so a `router.push('/')` right
 * after sign-in replays the stale redirect to the page the visitor is already on: the button keeps spinning although
 * the session exists, and only a manual reload shows the app. A full page load sends the new cookies, never reads the
 * stale router cache, and starts React Query and the Jotai stores from the signed-in session (the workspace switcher
 * reloads for the same reasons, see `use-workspace-switcher.ts`).
 */
export function navigateAfterSignIn(): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.location.assign('/');
}
