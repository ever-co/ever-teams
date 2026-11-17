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

// The organization a token was issued for, read from its claims. The kit only reads it to pick the organization; the
// API checks the signature of every request.
export function organizationOfToken(token: string): string | null {
	const payload = token.split('.')[1];
	if (!payload) {
		return null;
	}
	try {
		const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const claims = JSON.parse(atob(base64)) as { organizationId?: unknown };
		if (typeof claims.organizationId === 'string') {
			return claims.organizationId;
		}
		return null;
	} catch {
		return null;
	}
}
