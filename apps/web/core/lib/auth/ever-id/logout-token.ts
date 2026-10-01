import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

/**
 * Verification of OpenID Connect back-channel logout tokens (Back-Channel Logout 1.0, section 2.6) sent by
 * the Ever ID issuer.
 *
 * Checks: the signature against the issuer's published keys (ES256, RS256 or EdDSA); `iss` is the issuer;
 * `aud` contains this app's client id; `iat` present, at most 300 s old and not from the future (60 s skew);
 * `jti` present; the `events` claim carries the back-channel logout event; `sid` present; no `nonce`.
 * Replays (`jti` seen before) are the caller's check.
 *
 * Keys: the key set URL comes from the issuer's discovery document; a key set is reused for 600 s, and a
 * token signed with an unknown `kid` refetches it at most once every 30 s. The issuer comes only from the
 * deployment's configuration, and only https endpoints are used (plain http only on the local machine).
 */

/** The event a logout token must carry; an identifier fixed by the specification, never requested. */
export const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

/** A logout token older than this is refused, seconds. */
export const LOGOUT_TOKEN_MAX_AGE_S = 300;

/** Tolerance for a token dated slightly in the future, seconds. */
const CLOCK_SKEW_S = 60;

const JWKS_CACHE_MAX_AGE_MS = 600_000;
const JWKS_COOLDOWN_MS = 30_000;
const DISCOVERY_TTL_MS = 600_000;
const HTTP_TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 16_384;
const ALGORITHMS = ['ES256', 'RS256', 'EdDSA'];

/** Why a token was refused: `invalid` (bad token), `stale` (too old) or `unavailable` (no keys to check it). */
export type LogoutTokenFailure = 'invalid' | 'stale' | 'unavailable';

export class LogoutTokenError extends Error {
	constructor(
		readonly reason: LogoutTokenFailure,
		message: string
	) {
		super(message);
		this.name = 'LogoutTokenError';
	}
}

export interface VerifiedLogoutToken {
	jti: string;
	sid: string;
	sub?: string;
	iat: number;
}

export interface LogoutTokenOptions {
	/** The configured issuer (EVER_ID_ISSUER_URL). */
	issuer: string;
	/** This app's client id: the token's `aud` must contain it. */
	clientId: string;
	/** Current time in milliseconds (tests). */
	now?: number;
}

interface IssuerKeys {
	issuer: string;
	jwksUrl: string;
	getKey: JWTVerifyGetKey;
	expiresAt: number;
}

const issuerKeys = new Map<string, IssuerKeys>();

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** https, or plain http on the local machine only. */
export function isAllowedEndpoint(url: URL): boolean {
	if (url.protocol === 'https:') return true;
	return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

function sameIssuer(a: string, b: string): boolean {
	try {
		return new URL(a).href.replace(/\/+$/, '') === new URL(b).href.replace(/\/+$/, '');
	} catch {
		return false;
	}
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value ? value : undefined;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The issuer's key getter, from its discovery document (cached; a failed discovery is not cached). */
async function keysFor(configuredIssuer: string, now: number): Promise<IssuerKeys> {
	const cached = issuerKeys.get(configuredIssuer);
	if (cached && cached.expiresAt > now) return cached;

	let document: Record<string, unknown>;
	try {
		const discoveryUrl = new URL(`${configuredIssuer.replace(/\/+$/, '')}/.well-known/openid-configuration`);
		if (!isAllowedEndpoint(discoveryUrl)) throw new Error('issuer must use https');
		const response = await fetch(discoveryUrl, {
			headers: { Accept: 'application/json' },
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
		});
		if (!response.ok) throw new Error(`discovery answered ${response.status}`);
		document = (await response.json()) as Record<string, unknown>;
	} catch (error) {
		if (cached) return cached;
		throw new LogoutTokenError('unavailable', `Issuer discovery failed: ${(error as Error)?.message ?? 'error'}`);
	}

	const issuer = nonEmptyString(document?.issuer);
	const jwksUri = nonEmptyString(document?.jwks_uri);
	let jwksUrl: URL | undefined;
	try {
		jwksUrl = jwksUri ? new URL(jwksUri) : undefined;
	} catch {
		jwksUrl = undefined;
	}
	if (!issuer || !sameIssuer(issuer, configuredIssuer) || !jwksUrl || !isAllowedEndpoint(jwksUrl)) {
		if (cached) return cached;
		throw new LogoutTokenError('unavailable', 'Issuer discovery document is not usable');
	}

	// Kept across discovery refreshes while the key set URL stays the same, so its key cache survives.
	const getKey =
		cached && cached.issuer === issuer && cached.jwksUrl === jwksUrl.href
			? cached.getKey
			: createRemoteJWKSet(jwksUrl, {
					cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
					cooldownDuration: JWKS_COOLDOWN_MS,
					timeoutDuration: HTTP_TIMEOUT_MS
				});
	const keys: IssuerKeys = { issuer, jwksUrl: jwksUrl.href, getKey, expiresAt: now + DISCOVERY_TTL_MS };
	issuerKeys.set(configuredIssuer, keys);
	return keys;
}

/** jose's failures that say the keys could not be obtained, as opposed to a bad token. */
function isKeyAvailabilityError(error: unknown): boolean {
	const code = (error as { code?: string })?.code;
	return code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JOSE_GENERIC' || error instanceof TypeError;
}

/**
 * Verifies a back-channel logout token.
 *
 * @throws LogoutTokenError `invalid`, `stale` or `unavailable`.
 */
export async function verifyLogoutToken(token: string, options: LogoutTokenOptions): Promise<VerifiedLogoutToken> {
	if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || token.split('.').length !== 3) {
		throw new LogoutTokenError('invalid', 'Not a compact JWS');
	}
	const nowMs = options.now ?? Date.now();
	const keys = await keysFor(options.issuer, nowMs);

	let payload: JWTPayload;
	try {
		({ payload } = await jwtVerify(token, keys.getKey, {
			issuer: keys.issuer,
			audience: options.clientId,
			algorithms: ALGORITHMS,
			clockTolerance: CLOCK_SKEW_S,
			currentDate: new Date(nowMs),
			requiredClaims: ['iat', 'jti']
		}));
	} catch (error) {
		if (isKeyAvailabilityError(error)) {
			throw new LogoutTokenError('unavailable', 'Signing keys unavailable');
		}
		throw new LogoutTokenError(
			'invalid',
			`Logout token rejected (${(error as { code?: string })?.code ?? 'error'})`
		);
	}

	const now = Math.floor(nowMs / 1000);
	const iat = payload.iat;
	if (typeof iat !== 'number' || !Number.isFinite(iat)) {
		throw new LogoutTokenError('invalid', 'Logout token has no iat');
	}
	if (now - iat > LOGOUT_TOKEN_MAX_AGE_S) {
		throw new LogoutTokenError('stale', 'Logout token is too old');
	}
	if (iat > now + CLOCK_SKEW_S) {
		throw new LogoutTokenError('invalid', 'Logout token issued in the future');
	}
	const jti = nonEmptyString(payload.jti);
	if (!jti) {
		throw new LogoutTokenError('invalid', 'Logout token has no jti');
	}
	const events = (payload as Record<string, unknown>).events;
	if (!isJsonObject(events) || !isJsonObject(events[BACKCHANNEL_LOGOUT_EVENT])) {
		throw new LogoutTokenError('invalid', 'Logout token carries no back-channel logout event');
	}
	if ('nonce' in payload) {
		throw new LogoutTokenError('invalid', 'A logout token must not carry a nonce');
	}
	const sid = nonEmptyString((payload as Record<string, unknown>).sid);
	if (!sid) {
		throw new LogoutTokenError('invalid', 'Logout token names no session');
	}
	return { jti, sid, sub: nonEmptyString(payload.sub), iat };
}
