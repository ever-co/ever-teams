import { takeBoardReturn } from './board-return';

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
 * A sign-in the Board app started goes back to the Board instead, on the trusted Board origin only (board-return.ts).
 *
 * `replace` swaps the sign-in page out of the history (`location.replace`), for the paths that used
 * `router.replace('/')`: Back then leaves the app instead of reopening the sign-in page.
 */
export function navigateAfterSignIn({ replace = false }: { replace?: boolean } = {}): void {
	if (typeof window === 'undefined') {
		return;
	}
	// A page set for this sign-in (the workspace list's "Create a new workspace", #5025), else the Board a sign-in it
	// started goes back to (board-return.ts), else the home page. Both are taken, so neither is left for a later sign-in.
	const path = takePathAfterSignIn();
	const boardReturn = takeBoardReturn();
	if (path) {
		if (replace) {
			window.location.replace(path);
		} else {
			window.location.assign(path);
		}
		return;
	}
	if (boardReturn) {
		if (replace) {
			window.location.replace(boardReturn);
		} else {
			window.location.assign(boardReturn);
		}
		return;
	}
	if (replace) {
		window.location.replace('/');
		return;
	}
	// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full page load, see above
	window.location.assign('/');
}

/** The page the next sign-in of this tab opens instead of the home page, kept for this tab only. */
const PATH_AFTER_SIGN_IN_KEY = 'ever-teams:path-after-sign-in';

/**
 * How long the page set for a sign-in waits for it: the sign-in it was set for takes seconds. One that failed, or was
 * left another way than "Not you?", never sends a much later sign-in of the tab there.
 */
export const PATH_AFTER_SIGN_IN_TTL_MS = 5 * 60 * 1000;

/**
 * How long the consent page of a sign-in from a site waits for it: in that window the person may first fetch a code
 * from their e-mail or reset a password, and a later sign-in of that window is meant for that page (#5598).
 */
export const PATH_AFTER_SLOW_SIGN_IN_TTL_MS = 30 * 60 * 1000;

/**
 * Sets (or, with null, clears) the page the next sign-in of this tab opens instead of the home page: the workspace
 * list's "Create a new workspace" signs in to the chosen workspace, then opens the creation page (#5025). `setBy`
 * names the flow that set it, for one that may have to take back its own page later
 * ({@link clearPathAfterSignInSetBy}).
 */
export function setPathAfterSignIn(path: string | null, setBy?: string): void {
	try {
		if (path) {
			const entry = { path, setAt: Date.now(), ...(setBy ? { setBy } : {}) };
			window.sessionStorage.setItem(PATH_AFTER_SIGN_IN_KEY, JSON.stringify(entry));
		} else {
			window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		}
	} catch {
		// No storage (a private window): the sign-in opens the home page
	}
}

/**
 * Sets the page the next sign-in of this tab opens, for a sign-in that may take longer than a few minutes: it waits
 * {@link PATH_AFTER_SLOW_SIGN_IN_TTL_MS}. Every other page set for a sign-in keeps its few minutes.
 */
export function setPathAfterSlowSignIn(path: string): void {
	try {
		const entry = { path, setAt: Date.now(), waitMs: PATH_AFTER_SLOW_SIGN_IN_TTL_MS };
		window.sessionStorage.setItem(PATH_AFTER_SIGN_IN_KEY, JSON.stringify(entry));
	} catch {
		// No storage (a private window): the sign-in opens the home page
	}
}

// How long an entry waits: its own wait when it names one, never more than a slow sign-in's.
function waitOf(waitMs: unknown): number {
	if (typeof waitMs !== 'number') {
		return PATH_AFTER_SIGN_IN_TTL_MS;
	}
	return Math.min(waitMs, PATH_AFTER_SLOW_SIGN_IN_TTL_MS);
}

/**
 * Clears the page set for this sign-in only when it is `path`: the workspace list drops its own "Create a new
 * workspace" and keeps a page another page set before the sign-in (the site sign-in's consent page, #5528).
 */
export function clearPathAfterSignInIf(path: string): void {
	try {
		const stored = window.sessionStorage.getItem(PATH_AFTER_SIGN_IN_KEY);
		if (!stored) {
			return;
		}
		const entry = JSON.parse(stored) as { path?: unknown };
		if (entry.path === path) {
			window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		}
	} catch {
		// No storage, or an entry that cannot be read: the end of the sign-in drops it (takePathAfterSignIn)
	}
}

/**
 * Clears the page set for this sign-in only when the flow `setBy` set it: an Ever ID start link that names no page
 * takes back the page an earlier, abandoned one set, never a page another flow set since (even the same page).
 */
export function clearPathAfterSignInSetBy(setBy: string): void {
	try {
		const stored = window.sessionStorage.getItem(PATH_AFTER_SIGN_IN_KEY);
		if (!stored) {
			return;
		}
		const entry = JSON.parse(stored) as { setBy?: unknown };
		if (entry.setBy === setBy) {
			window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		}
	} catch {
		// No storage, or an entry that cannot be read: the end of the sign-in drops it (takePathAfterSignIn)
	}
}

/** The page set for this sign-in, read once; null (the home page) unless it is a page of this app, set lately. */
function takePathAfterSignIn(): string | null {
	try {
		const stored = window.sessionStorage.getItem(PATH_AFTER_SIGN_IN_KEY);
		window.sessionStorage.removeItem(PATH_AFTER_SIGN_IN_KEY);
		const { path, setAt, waitMs } = (stored ? JSON.parse(stored) : {}) as {
			path?: unknown;
			setAt?: unknown;
			waitMs?: unknown;
		};
		const isRecent = typeof setAt === 'number' && Date.now() - setAt <= waitOf(waitMs);
		if (!isRecent || typeof path !== 'string' || !path.startsWith('/')) {
			return null;
		}
		// Resolved against this origin: "//host" or "/\\host" would lead to another site. The fragment stays: the page
		// set for the sign-in can name a part of itself (a link's `#section`)
		const url = new URL(path, window.location.origin);
		return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
	} catch {
		return null;
	}
}
