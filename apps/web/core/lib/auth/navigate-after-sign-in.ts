/**
 * Opens the app once a sign-in has set the auth cookies, with a full page load.
 *
 * Not `router.push('/')`: while the visitor is still signed out, Next.js prefetches `/` and `proxy.ts` answers that
 * prefetch with a redirect to the sign-in page. The client router keeps that answer, so a `router.push('/')` right
 * after sign-in replays the stale redirect to the page the visitor is already on: the button keeps spinning although
 * the session exists, and only a manual reload shows the app. A full page load sends the new cookies, never reads the
 * stale router cache, and starts React Query and the Jotai stores from the signed-in session (the workspace switcher
 * reloads for the same reasons, see `use-workspace-switcher.ts`).
 *
 * `replace` swaps the sign-in page out of the history (`location.replace`), for the paths that used
 * `router.replace('/')`: Back then leaves the app instead of reopening the sign-in page.
 */
export function navigateAfterSignIn({ replace = false }: { replace?: boolean } = {}): void {
	if (typeof window === 'undefined') {
		return;
	}
	// A page set for this sign-in (the workspace list's "Create a new workspace", #5025), else the home page
	const path = takePathAfterSignIn();
	if (path) {
		if (replace) {
			window.location.replace(path);
		} else {
			window.location.assign(path);
		}
		return;
	}
	if (replace) {
		window.location.replace('/');
		return;
	}
	window.location.assign('/');
}

/** The page the next sign-in of this tab opens instead of the home page, kept for this tab only. */
const PATH_AFTER_SIGN_IN_KEY = 'ever-teams:path-after-sign-in';

/**
 * Sets (or, with null, clears) the page the next sign-in of this tab opens instead of the home page: the workspace
 * list's "Create a new workspace" signs in to the chosen workspace, then opens the creation page (#5025).
 */
export function setPathAfterSignIn(path: string | null): void {
	try {
		if (path) {
			window.sessionStorage.setItem(PATH_AFTER_SIGN_IN_KEY, path);
		} else {
			window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		}
	} catch {
		// No storage (a private window): the sign-in opens the home page
	}
}

/** The page set for this sign-in, read once; null (the home page) unless it is a page of this app. */
function takePathAfterSignIn(): string | null {
	try {
		const path = window.sessionStorage.getItem(PATH_AFTER_SIGN_IN_KEY);
		window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		if (!path?.startsWith('/')) {
			return null;
		}
		// Resolved against this origin: "//host" or "/\\host" would lead to another site
		const url = new URL(path, window.location.origin);
		return url.origin === window.location.origin ? `${url.pathname}${url.search}` : null;
	} catch {
		return null;
	}
}
