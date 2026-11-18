// Sign-in from the host's backend: the host passes `config.getToken`, which asks its own server for a short-lived
// Ever Teams token for the person signed in to the host product (the server exchanges its embed credential for it).

export interface KitHostToken {
	// The access token for the person signed in to the host product.
	token: string;
	// When it stops working: an ISO date, a Date, or milliseconds since the epoch.
	expiresAt: string | number | Date;
}

export type GetKitToken = () => Promise<KitHostToken>;

// A token is asked for again a minute before it expires, or halfway through a shorter life.
export const REFRESH_LEAD_MS = 60_000;
// Never sooner than this after the last answer, whatever expiry the host returned.
export const MIN_REFRESH_DELAY_MS = 5_000;
// A token must have at least this left when it arrives: the next one is then asked for before it expires, and never
// sooner than MIN_REFRESH_DELAY_MS. A shorter life (or an unreadable expiry) is refused rather than asked for in a loop.
export const MIN_TOKEN_LIFE_MS = 2 * MIN_REFRESH_DELAY_MS;

// The expiry as milliseconds since the epoch; 0 for a value that is not a date.
export function expiryOf(expiresAt: KitHostToken['expiresAt']): number {
	const time = new Date(expiresAt).getTime();
	if (Number.isNaN(time)) {
		return 0;
	}
	return time;
}

// How long to wait before asking for the next token.
export function refreshDelayMs(expiresAt: number, now: number): number {
	const remaining = expiresAt - now;
	let lead = REFRESH_LEAD_MS;
	if (remaining < 2 * REFRESH_LEAD_MS) {
		lead = remaining / 2;
	}
	return Math.max(MIN_REFRESH_DELAY_MS, remaining - lead);
}

// The claims of a token (its middle part), or null when it is not a JWT. The kit only reads them to pick the
// organization and to notice another person; the API checks the signature of every request.
function claimsOf(token: string): Record<string, unknown> | null {
	const payload = token.split('.')[1];
	if (!payload) {
		return null;
	}
	try {
		const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const claims: unknown = JSON.parse(atob(base64));
		if (claims && typeof claims === 'object') {
			return claims as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

// The organization a token was issued for, read from its claims.
export function organizationOfToken(token: string): string | null {
	const organizationId = claimsOf(token)?.organizationId;
	if (typeof organizationId === 'string') {
		return organizationId;
	}
	return null;
}

// Whose token this is: its person and organization; the token itself when its claims cannot be read, so that a token
// the kit cannot read is never taken for the same person's.
export function ownerOfToken(token: string): string {
	const claims = claimsOf(token);
	const person = claims?.id ?? claims?.sub;
	if (typeof person !== 'string') {
		return token;
	}
	return `${person}|${organizationOfToken(token) ?? ''}`;
}
