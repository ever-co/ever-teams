import { clearPathAfterSignInIf, setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { EVER_ID_START_RETURN_COOKIE, readEverIdStartReturnCookie } from './start';

/** The page the last start of this tab kept, so a later start without one can take back exactly that. */
const KEPT_KEY = 'ever-teams:ever-id-start-return';

function tabStorage(): Storage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

/**
 * Ever ID, browser side: the page a sign-in begun by a link to the start address (app/api/auth/ever-id/start) opens
 * once it is done.
 *
 * The start address keeps the link's return path in a short-lived cookie (start.ts), since after the issuer the
 * sign-in can continue on more than one page: the workspace chooser, or the e-mail code step first
 * (`/auth/passcode?ever_id=confirm`). The page that ends the sign-in calls this once: the path, checked again, becomes
 * the page the sign-in opens (`setPathAfterSignIn`, then `navigateAfterSignIn`), and the cookie is dropped so a later
 * sign-in of the browser does not go there too.
 *
 * A start that names no page (its cookie is empty) undoes what an earlier start of the tab kept and was left before
 * the workspace sign-in, and nothing else: a page set for the sign-in another way stays.
 */
export function keepEverIdStartReturnForSignIn(): void {
	if (typeof document === 'undefined' || !document.cookie.includes(`${EVER_ID_START_RETURN_COOKIE}=`)) return;
	const returnPath = readEverIdStartReturnCookie(document.cookie);
	// Dropped with the attributes it was written with (Secure on https, as the route sets it there)
	const secure = window.location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${EVER_ID_START_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;

	const storage = tabStorage();
	try {
		const earlier = storage?.getItem(KEPT_KEY);
		if (earlier) clearPathAfterSignInIf(earlier);
		if (returnPath) storage?.setItem(KEPT_KEY, returnPath);
		else storage?.removeItem(KEPT_KEY);
	} catch {
		// No storage (a private window): the path below is kept or not the same way
	}
	if (returnPath) setPathAfterSignIn(returnPath);
}
