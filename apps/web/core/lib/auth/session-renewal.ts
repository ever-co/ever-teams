import {
	getAccessTokenCookie,
	getRefreshTokenCookie,
	setAccessTokenCookie,
	setRefreshTokenCookie
} from '@/core/lib/helpers/cookies';
import { logInDev } from '@/core/lib/helpers/error-message';
import { delay, isUnauthorizedError } from '@/core/lib/auth/retry-logic';
import { isRotatedRefreshTokenRefusal } from '@/core/lib/auth/rotated-refresh-token';

/**
 * How a renewal of the session ended:
 * - `renewed`: the cookies hold an access token the API accepts, a request refused with the old one can be sent again;
 * - `ended`: there is no refresh token (`hadRefreshToken` false), or the API refuses it. Only a new sign-in opens a
 *   session again;
 * - `unavailable`: no new pair now, and nothing is known about the session. Either the renewal failed for a reason of
 *   its own (no network, a timeout, a server error: `error`), or the refused token was itself renewed moments ago, and
 *   renewing again would not change the API's answer.
 */
type SessionRenewal =
	| { outcome: 'renewed' }
	| { outcome: 'ended'; hadRefreshToken: boolean }
	| { outcome: 'unavailable'; error?: unknown };

/**
 * How long a token this tab has just obtained is not renewed again because a request made with it was refused: that
 * refusal cannot be an expired token, and a route that answers 401 for a reason of its own would otherwise make every
 * call to it rotate the session's tokens.
 */
const RENEWED_TOKEN_GRACE_MS = 30_000;

/** The Web Lock one renewal at a time runs under, among the tabs of the browser. */
const RENEWAL_LOCK = 'ever-teams.session-renewal';

/** How long a tab waits for that lock before it renews without it: the tab that holds it may never answer. */
const RENEWAL_LOCK_WAIT_MS = 15_000;

/**
 * How long, and how often, a renewal whose refresh token another one rotated first looks for that one's pair in the
 * cookies: the other answer may still be on its way to the browser.
 */
const OTHER_PAIR_WAIT_MS = 10_000;
const OTHER_PAIR_POLL_MS = 100;

let renewalInFlight: Promise<SessionRenewal> | null = null;
let lastRenewal: { accessToken: string; at: number } | null = null;

function isJustRenewed(accessToken: string): boolean {
	return lastRenewal?.accessToken === accessToken && Date.now() - lastRenewal.at < RENEWED_TOKEN_GRACE_MS;
}

/**
 * The refresh token was refused. Every tab shares one refresh token, and Gauzy accepts it once: when another renewal
 * (another tab, or the server while a page loads) sent it first, that one has the new pair, and this refusal says
 * nothing about the session.
 *
 * @param sentRefreshToken The refresh token this renewal sent.
 * @param refusal The 401 it was answered.
 * @returns `renewed` once the cookies hold the pair of the other renewal, `ended` otherwise.
 */
async function takePairOfOtherRenewal(sentRefreshToken: string, refusal: unknown): Promise<SessionRenewal> {
	const ended: SessionRenewal = { outcome: 'ended', hadRefreshToken: true };
	const holdsOtherPair = () => {
		const refreshToken = getRefreshTokenCookie();
		return !!refreshToken && refreshToken !== sentRefreshToken;
	};
	if (holdsOtherPair()) {
		return { outcome: 'renewed' };
	}
	if (!isRotatedRefreshTokenRefusal((refusal as { message?: unknown } | null)?.message)) {
		return ended;
	}

	// Rotated by a renewal whose answer has not reached the cookies yet
	for (let waited = 0; waited < OTHER_PAIR_WAIT_MS; waited += OTHER_PAIR_POLL_MS) {
		await delay(OTHER_PAIR_POLL_MS);
		if (holdsOtherPair()) {
			return { outcome: 'renewed' };
		}
		// Signed out meanwhile, here or in another tab
		if (!getRefreshTokenCookie()) {
			return ended;
		}
	}
	return ended;
}

/**
 * Asks the API for a new pair with the refresh token, and keeps the pair in the cookies.
 *
 * @param refreshTokenAtCall The refresh token the session held when the renewal was asked for.
 */
async function requestNewPair(refreshTokenAtCall: string | undefined): Promise<SessionRenewal> {
	const refreshToken = getRefreshTokenCookie();
	if (!refreshToken) {
		return { outcome: 'ended', hadRefreshToken: false };
	}
	if (refreshTokenAtCall && refreshToken !== refreshTokenAtCall) {
		// Another tab renewed the session while this one waited for its turn: its pair is the session's
		return { outcome: 'renewed' };
	}

	try {
		// Loaded when needed: the API services are built on api.service.ts, which renews the session through this module
		const { authService } = await import('@/core/services/client/api/auth/auth.service');
		const { data } = await authService.refreshTokenRaw(refreshToken);
		if (!data?.token) {
			// Gauzy answers 200 without a pair for an error it did not expect
			return { outcome: 'unavailable', error: new Error('The session renewal answered no token') };
		}
		if (getRefreshTokenCookie() !== refreshToken) {
			// The cookies no longer hold the token that was sent: a sign-in, a sign-out or another renewal came
			// first. This answer is older than what they hold, and never replaces it.
			return getRefreshTokenCookie() ? { outcome: 'renewed' } : { outcome: 'ended', hadRefreshToken: false };
		}

		setAccessTokenCookie(data.token);
		// Gauzy rotates the refresh token: the one just sent is refused from now on
		if (data.refresh_token) {
			setRefreshTokenCookie(data.refresh_token);
		}
		lastRenewal = { accessToken: data.token, at: Date.now() };
		logInDev('[Auth] Session renewed');
		return { outcome: 'renewed' };
	} catch (error) {
		if (isUnauthorizedError(error)) {
			return takePairOfOtherRenewal(refreshToken, error);
		}
		return { outcome: 'unavailable', error };
	}
}

/**
 * One renewal at a time among the tabs of the browser, where it has Web Locks (secure contexts): a tab that waited
 * for its turn finds the pair the tab before it stored, and sends nothing. Elsewhere, and when the lock is not
 * given in time, the renewal runs on its own: a refusal because another one rotated the token first is then
 * settled by takePairOfOtherRenewal().
 */
async function renewInTurn(refreshTokenAtCall: string | undefined): Promise<SessionRenewal> {
	const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
	if (!locks?.request) {
		return requestNewPair(refreshTokenAtCall);
	}

	const waiting = new AbortController();
	const giveUp = setTimeout(() => waiting.abort(), RENEWAL_LOCK_WAIT_MS);
	try {
		// The lock awaits the callback's promise and answers its value; the DOM typing names the promise itself
		return (await locks.request(RENEWAL_LOCK, { signal: waiting.signal }, () => {
			clearTimeout(giveUp);
			return requestNewPair(refreshTokenAtCall);
		})) as SessionRenewal;
	} catch (error) {
		if (waiting.signal.aborted) {
			return requestNewPair(refreshTokenAtCall);
		}
		return { outcome: 'unavailable', error };
	} finally {
		clearTimeout(giveUp);
	}
}

/**
 * Renews the session with the refresh token: the one way the browser gets a new access token, whoever asks (a
 * request the API refused, the renewal ahead of time, a page that needs a fresh token). Callers that ask while a
 * renewal is under way share it, and the tabs of the browser renew one at a time, so the refresh token, which Gauzy
 * accepts once, is sent once.
 *
 * @param refusedToken The access token of the request the API refused with 401, when the renewal answers one. When
 *   the session already holds another token, it was renewed since that request left, and nothing is sent.
 */
export function renewSession(refusedToken?: string | null): Promise<SessionRenewal> {
	if (refusedToken) {
		const currentToken = getAccessTokenCookie();
		if (currentToken && currentToken !== refusedToken) {
			return Promise.resolve({ outcome: 'renewed' });
		}
		if (isJustRenewed(refusedToken)) {
			return Promise.resolve({ outcome: 'unavailable' });
		}
	}

	if (!renewalInFlight) {
		const renewal = renewInTurn(getRefreshTokenCookie()).finally(() => {
			if (renewalInFlight === renewal) {
				renewalInFlight = null;
			}
		});
		renewalInFlight = renewal;
	}
	return renewalInFlight;
}

/** Test-only: forget the renewal under way and the last one made. */
export function resetSessionRenewal(): void {
	renewalInFlight = null;
	lastRenewal = null;
}
