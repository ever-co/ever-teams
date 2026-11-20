import { NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { DEFAULT_MAIN_PATH, IS_DEMO_MODE } from '@/core/constants/config/constants';
import { EVER_ID_PROVIDER_ID, isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { everIdCookieSecure } from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome } from '@/core/lib/auth/ever-id/log';
import {
	EVER_ID_SIGN_IN_LANDING_PATH,
	everIdStartReturnCookie,
	isEverIdStartNavigation,
	isEverIdStartRouteEnabled,
	readEverIdStartReturnPath
} from '@/core/lib/auth/ever-id/start';
import { isTokenExpired } from '@/core/lib/auth/jwt-utils';
import { requestAccessToken, requestCookies } from '@/core/services/server/request-cookies';

/**
 * Ever ID: a link that begins "Login with Ever ID" directly.
 *
 *     GET /api/auth/ever-id/start[?return=/a/path/of/this/site]
 *
 * Another Ever app that links here ("Open Ever Teams") lands a person in the Ever ID sign-in instead of on the
 * sign-in page. It starts exactly what the "Login with Ever ID" button starts (`signInFunction`,
 * core/lib/helpers/social-logins.ts): next-auth's sign-in with the Ever ID provider, which keeps the PKCE verifier,
 * the `state`, the nonce and the landing page in next-auth's own short-lived cookies and answers the issuer's
 * authorization address, where the browser goes next. The callback then finishes the sign-in as it does for the
 * button, and the sign-in lands on the workspace chooser.
 *
 * | Request                                      | Answer                                         |
 * | -------------------------------------------- | ---------------------------------------------- |
 * | switch off (the default)                     | `404`, nothing read, nothing called            |
 * | not a top-level `GET` navigation             | `404`, nothing called                          |
 * | any other method                             | `404`, nothing called                          |
 * | Ever ID not offered on the sign-in page      | `404`                                          |
 * | already signed in                            | the destination, no new sign-in                |
 * | signed out                                   | the issuer's authorization address             |
 * | the sign-in cannot start (issuer down, ...)  | `/auth/error?error=<code>`, a code only        |
 *
 * The destination is the `return` path when it is a path of this site (`readEverIdStartReturnPath`), otherwise the
 * page a signed-in visit to the sign-in page opens (`/`). For a signed-out person the path waits in a short-lived
 * cookie (`everIdStartReturnCookie`, the lifetime of next-auth's own sign-in cookies), since after the issuer the
 * sign-in can continue on the workspace chooser or on the e-mail code step first: the page that ends it checks the
 * path again and opens it once the workspace sign-in is done (core/lib/auth/ever-id/start-return.ts). A refused
 * `return` is ignored, never repaired, and never an error: the person still signs in.
 *
 * "Already signed in" is what the sign-in page itself goes by before it sends a visit on to the app (proxy.ts): an
 * access token that has not expired. Anything else (no token, an expired one) counts as signed out: the person then
 * signs in with Ever ID, which is always safe.
 *
 * **Safe as a cross-site link.** A `GET` anyone can link to must change nothing by itself:
 *
 *  - it signs nobody in: that takes the person's own sign-in at the issuer and next-auth's `state` / PKCE / nonce
 *    check against this browser's cookies;
 *  - a signed-in person is only sent to a path of this site, as a plain link to that path would;
 *  - nothing another site loads in the background starts a sign-in (`isEverIdStartNavigation`);
 *  - every answer is `Cache-Control: no-store` and carries the Referrer-Policy the sign-in page has (the browser
 *    default, `strict-origin-when-cross-origin`: this app sends none for it), and no address built here holds a
 *    token, the `state` or a verifier; the return-path cookie holds a checked path of this site and nothing else.
 *
 * Under `/api/auth/ever-id` with the other Ever ID routes, which proxy.ts leaves alone: with the switch off the
 * path answers `404` to everyone, as any unknown `/api` path does, and nothing else in the app changes.
 */

/** Answered per request, never from a build or a cache: the switch, the cookies and the sign-in belong to it. */
export const dynamic = 'force-dynamic';

/** The Referrer-Policy the sign-in page is served with: no header there, so the browser default. */
const REFERRER_POLICY = 'strict-origin-when-cross-origin';

const RESPONSE_HEADERS = {
	'Cache-Control': 'no-store',
	'Referrer-Policy': REFERRER_POLICY
} as const;

/** The sign-in error page (next-auth's `pages.error`, auth.ts). */
const ERROR_PAGE_PATH = '/auth/error';

/** The code the error page shows when the sign-in could not start. */
const START_FAILED_CODE = 'OAuthSignin';

/** The shape of a code the error page shows (core/components/pages/auth/sign-in-error.tsx). */
const ERROR_CODE = /^[A-Za-z]{1,40}$/;

/** How close to its expiry an access token counts as expired: the margin proxy.ts uses on the sign-in page. */
const TOKEN_EXPIRY_MARGIN_S = 60;

/** What an unknown path answers: a `404` with no body. */
function notFound(): NextResponse {
	return new NextResponse(null, { status: 404, headers: RESPONSE_HEADERS });
}

/**
 * A temporary redirect (`307`, as `redirect()` answers in a route handler) with this route's headers. `location` is
 * a path of this site (sent as given, so it never depends on what the server believes its own origin is) or the
 * issuer's authorization address.
 */
function redirectTo(location: string): NextResponse {
	return new NextResponse(null, { status: 307, headers: { ...RESPONSE_HEADERS, Location: location } });
}

/** The sign-in error page with a code, and nothing else. */
function errorPage(code: string): string {
	const shown = ERROR_CODE.test(code) ? code : START_FAILED_CODE;
	return `${ERROR_PAGE_PATH}?${new URLSearchParams({ error: shown }).toString()}`;
}

/** Whether the request carries an access token that has not expired: what the sign-in page goes by (proxy.ts). */
function isSignedIn(request: Request): boolean {
	const accessToken = requestAccessToken(requestCookies(request));
	return !!accessToken && !isTokenExpired(accessToken, TOKEN_EXPIRY_MARGIN_S);
}

/**
 * The address next-auth answered, as an absolute http(s) URL (http only matters for a local issuer in development),
 * written the way the URL parser writes it, which is always a valid header value. next-auth answers its own error
 * page instead when the sign-in could not start; that comes back as `failed` with the page's code.
 */
function toAuthorizationUrl(value: unknown): { url: string } | { failed: string } {
	if (typeof value === 'string') {
		try {
			const url = new URL(value);
			if (url.pathname === ERROR_PAGE_PATH) {
				return { failed: url.searchParams.get('error') ?? START_FAILED_CODE };
			}
			if (url.protocol === 'https:' || url.protocol === 'http:') {
				return { url: url.href };
			}
		} catch {
			// fall through
		}
	}
	throw new Error('next-auth answered without a usable authorization address');
}

export async function GET(request: Request) {
	if (!isEverIdStartRouteEnabled() || !isEverIdStartNavigation(request)) {
		return notFound();
	}

	// The gate of the "Login with Ever ID" button on the sign-in page: Ever ID is configured (the provider next-auth
	// serves and the browser is told about), and demo mode does not hide the social sign-ins.
	if (!isEverIdConfigured() || IS_DEMO_MODE) {
		return notFound();
	}

	const returnPath = readEverIdStartReturnPath(new URL(request.url).searchParams);

	if (isSignedIn(request)) {
		logEverIdOutcome('ever_id.start', { outcome: 'signed_in' });
		return redirectTo(returnPath ?? DEFAULT_MAIN_PATH);
	}

	const startedAt = Date.now();
	let answer: { url: string } | { failed: string };
	try {
		// The button's sign-in (signInFunction), answered here as an address instead of a redirect it throws.
		answer = toAuthorizationUrl(
			await signIn(EVER_ID_PROVIDER_ID, { redirectTo: EVER_ID_SIGN_IN_LANDING_PATH, redirect: false })
		);
	} catch (error) {
		// Anyone can request this address: the log names the kind of failure, and the person sees a code only.
		console.error(
			'Ever ID sign-in could not start:',
			error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error'
		);
		answer = { failed: START_FAILED_CODE };
	}

	if ('failed' in answer) {
		logEverIdOutcome('ever_id.start', { outcome: 'failed', latencyMs: Date.now() - startedAt });
		return redirectTo(errorPage(answer.failed));
	}

	logEverIdOutcome('ever_id.start', { outcome: 'started', latencyMs: Date.now() - startedAt });
	const response = redirectTo(answer.url);
	// The path for the end of this sign-in, or, without one, an empty cookie: this sign-in then opens the usual page,
	// whatever an earlier, abandoned start kept.
	response.cookies.set(everIdStartReturnCookie(returnPath, everIdCookieSecure(request.headers, request.url)));
	return response;
}

/**
 * The address is a link: a `GET`, and nothing else. Every other method gets the `404` of a path that does not
 * exist, whatever the switch says, in place of the `405` and the `Allow` list that would tell a route is here while
 * it is off. `HEAD` is listed too, rather than left to Next.js to answer through `GET` (which refuses it as well).
 */
function notALink(): NextResponse {
	return notFound();
}

export const HEAD = notALink;
export const POST = notALink;
export const PUT = notALink;
export const PATCH = notALink;
export const DELETE = notALink;
export const OPTIONS = notALink;
