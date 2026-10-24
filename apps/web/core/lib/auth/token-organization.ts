import { decodeJWT } from '@/core/lib/auth/jwt-utils';
import {
	getAccessTokenCookie,
	getOrganizationIdCookie,
	setAccessTokenCookie,
	setOrganizationIdCookie,
	setRefreshTokenCookie
} from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';

/**
 * Gauzy confines a non-admin to the organization in their access token (organization boundary,
 * ever-co/ever-gauzy#11316).
 * Ever Teams picks the organization it acts in from the active team (the organization cookie every request carries),
 * so when that differs from the token's, the token is switched with `POST /auth/switch-organization`. Without it a
 * member of two organizations of one tenant got empty lists and 400s in the second one.
 */

const inFlight = new Map<string, Promise<boolean>>();
// An organization Gauzy refused (401 not a member / inactive there, or an expired token; 403 no permission) is not
// asked again WITH THAT TOKEN: a refreshed or new token retries. A network error or a 5xx retries at the next call.
// Only the current token's refusals are kept (a replaced token never asks again), so none piles up in a long-lived tab.
let refused: { token: string; organizations: Set<string> } = { token: '', organizations: new Set() };

/** The organizations refused to `token`; a new token starts with none (and the old token's list is dropped). */
function refusedTo(token: string): Set<string> {
	if (refused.token !== token) refused = { token, organizations: new Set() };
	return refused.organizations;
}

/**
 * A pending switch request belongs to the organization AND the token that asked: a refreshed token, or another user's
 * after a sign-in in another tab, asks on its own instead of joining the old request.
 */
const requestKey = (token: string, organizationId: string) => `${organizationId} ${token}`;

/**
 * The HTTP status of a failed request, when it got an answer: an Axios error (`response.status`, proxy mode) or the
 * API service's ApiErrorService (`httpResponseStatus`, direct mode).
 */
function statusOf(error: unknown): number | undefined {
	const failed = error as { response?: { status?: unknown }; httpResponseStatus?: unknown } | null;
	const status = failed?.httpResponseStatus ?? failed?.response?.status;
	return typeof status === 'number' ? status : undefined;
}

/** The organization the access token acts in, or null when there is no token or it names none. */
export function tokenOrganizationId(token = getAccessTokenCookie()): string | null {
	return (token && decodeJWT(token)?.organizationId) || null;
}

/**
 * Makes the access token act in `organizationId` (by default the organization cookie). Resolves true when it switched
 * the token, false when nothing was needed or Gauzy refused.
 */
export function syncTokenOrganization(
	organizationId: string | null | undefined = getOrganizationIdCookie()
): Promise<boolean> {
	const target = organizationId || null;
	const token = getAccessTokenCookie();
	if (!target || !token || tokenOrganizationId(token) === target) return Promise.resolve(false);

	const key = requestKey(token, target);
	if (refusedTo(token).has(target)) return Promise.resolve(false);
	const pending = inFlight.get(key);
	if (pending) return pending;

	const switching = authService
		.switchOrganizationRaw(target)
		.then(({ data }) => {
			// Gauzy answers null for an error it did not expect: try again later
			if (!data?.token) return false;
			// The answer is late: the user chose another organization meanwhile (it no longer is the cookie's), or
			// signed out. Saving it would put the tokens out of step with the active team.
			const chosen = getOrganizationIdCookie() || null;
			// The answer is for the token that asked only: once the cookie holds another one (a sign-in as someone else in
			// another tab, a refresh, a newer switch that answered first), saving it would replace newer tokens.
			if (getAccessTokenCookie() !== token || (chosen && chosen !== target)) return false;
			setAccessTokenCookie(data.token);
			if (data.refresh_token) setRefreshTokenCookie(data.refresh_token);
			setOrganizationIdCookie(target);
			return true;
		})
		.catch((error: unknown) => {
			const status = statusOf(error);
			// A refusal of a token that was replaced meanwhile is of no use: the new token asks on its own
			if ((status === 401 || status === 403) && refused.token === token) refused.organizations.add(target);
			console.error('[Auth] Could not switch the token to the organization of the active team:', error);
			return false;
		})
		.finally(() => {
			inFlight.delete(key);
		});
	inFlight.set(key, switching);
	return switching;
}

/** Test-only: forget the organizations Gauzy refused. */
export function resetTokenOrganizationState(): void {
	inFlight.clear();
	refused = { token: '', organizations: new Set() };
}
