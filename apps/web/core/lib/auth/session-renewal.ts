import {
	getAccessTokenCookie,
	getRefreshTokenCookie,
	setAccessTokenCookie,
	setRefreshTokenCookie
} from '@/core/lib/helpers/cookies';
import { logInDev } from '@/core/lib/helpers/error-message';
import { isUnauthorizedError } from '@/core/lib/auth/retry-logic';

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

let renewalInFlight: Promise<SessionRenewal> | null = null;
let lastRenewal: { accessToken: string; at: number } | null = null;

function isJustRenewed(accessToken: string): boolean {
	return lastRenewal?.accessToken === accessToken && Date.now() - lastRenewal.at < RENEWED_TOKEN_GRACE_MS;
}

/** Asks the API for a new pair with the refresh token, and keeps the pair in the cookies. */
async function requestNewPair(): Promise<SessionRenewal> {
	const refreshToken = getRefreshTokenCookie();
	if (!refreshToken) {
		return { outcome: 'ended', hadRefreshToken: false };
	}

	try {
		// Loaded when needed: the API services are built on api.service.ts, which renews the session through this module
		const { authService } = await import('@/core/services/client/api/auth/auth.service');
		const { data } = await authService.refreshTokenRaw(refreshToken);
		if (!data?.token) {
			// Gauzy answers 200 without a pair for an error it did not expect
			return { outcome: 'unavailable', error: new Error('The session renewal answered no token') };
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
			return { outcome: 'ended', hadRefreshToken: true };
		}
		return { outcome: 'unavailable', error };
	}
}

/**
 * Renews the session with the refresh token: the one way the browser gets a new access token once the current one
 * is refused. Callers that ask while a renewal is under way share it, so the refresh token, which Gauzy accepts
 * once, is sent once however many requests were refused together.
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
		const renewal = requestNewPair().finally(() => {
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
