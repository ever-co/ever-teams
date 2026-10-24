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
// An organization Gauzy refused to switch to is not asked again in this page's life
const refused = new Set<string>();

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
	if (!target || !token || tokenOrganizationId(token) === target || refused.has(target)) {
		return Promise.resolve(false);
	}

	const pending = inFlight.get(target);
	if (pending) return pending;

	const switching = authService
		.switchOrganizationRaw(target)
		.then(({ data }) => {
			if (!data?.token) {
				refused.add(target);
				return false;
			}
			setAccessTokenCookie(data.token);
			if (data.refresh_token) setRefreshTokenCookie(data.refresh_token);
			setOrganizationIdCookie(target);
			return true;
		})
		.catch((error: unknown) => {
			refused.add(target);
			console.error('[Auth] Could not switch the token to the organization of the active team:', error);
			return false;
		})
		.finally(() => {
			inFlight.delete(target);
		});
	inFlight.set(target, switching);
	return switching;
}

/** Test-only: forget the organizations Gauzy refused. */
export function resetTokenOrganizationState(): void {
	inFlight.clear();
	refused.clear();
}
