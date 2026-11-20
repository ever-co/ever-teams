import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { EVER_ID_START_RETURN_COOKIE, readEverIdStartReturnCookie } from './start';

/**
 * Ever ID, browser side: the page a sign-in begun by a link to the start address (app/api/auth/ever-id/start) opens
 * once it is done.
 *
 * The start address keeps the link's return path in a short-lived cookie (start.ts), since after the issuer the
 * sign-in can continue on more than one page: the workspace chooser, or the e-mail code step first
 * (`/auth/passcode?ever_id=confirm`). The page that ends the sign-in calls this once: the path, checked again, becomes
 * the page the sign-in opens (`setPathAfterSignIn`, then `navigateAfterSignIn`), and the cookie is dropped so a later
 * sign-in of the browser does not go there too.
 */
export function keepEverIdStartReturnForSignIn(): void {
	if (typeof document === 'undefined') return;
	const returnPath = readEverIdStartReturnCookie(document.cookie);
	if (!document.cookie.includes(`${EVER_ID_START_RETURN_COOKIE}=`)) return;
	const secure = window.location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${EVER_ID_START_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
	if (returnPath) setPathAfterSignIn(returnPath);
}
