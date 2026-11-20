import { clearPathAfterSignInSetBy, setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { EVER_ID_START_RETURN_COOKIE, hasEverIdStartReturnCookie, readEverIdStartReturnCookie } from './start';

/** How a page this module sets for the sign-in is marked, so a later start can take back that one only. */
const SET_BY = 'ever-id-start';

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
 * A start that names no page (its cookie is empty) takes back the page an earlier, abandoned start of the tab set,
 * and nothing else: a page another flow set for the sign-in since stays, even when it is the same page.
 */
export function keepEverIdStartReturnForSignIn(): void {
	if (typeof document === 'undefined' || !hasEverIdStartReturnCookie(document.cookie)) return;
	const returnPath = readEverIdStartReturnCookie(document.cookie);
	// Dropped by name and path: a cookie is replaced whatever its Secure flag, which follows the page's protocol here
	const secure = window.location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${EVER_ID_START_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;

	if (returnPath) {
		setPathAfterSignIn(returnPath, SET_BY);
	} else {
		clearPathAfterSignInSetBy(SET_BY);
	}
}
