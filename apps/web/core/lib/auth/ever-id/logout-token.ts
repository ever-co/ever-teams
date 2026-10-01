import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

/**
 * Verification of OpenID Connect back-channel logout tokens (Back-Channel Logout 1.0, section 2.6) sent by
 * the Ever ID issuer.
 *
 * Checks: the signature against the issuer's published keys (ES256, RS256 or EdDSA); `iss` is the issuer;
 * `aud` contains this app's client id; `iat` present, at most 300 s old and not from the future (60 s skew);
 * `jti` present; the `events` claim carries the back-channel logout event; `sid` or `sub` present (a token naming
 * only the subject ends every session of that person); no `nonce`.
 * Replays (`jti` seen before) are the caller's check.
 *
 * Keys: the key set URL comes from the issuer's discovery document; a key set is reused for 600 s, and a
 * token signed with an unknown `kid` refetches it at most once every 30 s. The issuer comes only from the
 * deployment's configuration, and only https endpoints are used (plain http only on the local machine).
 */

/** The event a logout token must carry; an identifier fixed by the specification, never requested. */
const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

/** A logout token older than this is refused, seconds. */
const LOGOUT_TOKEN_MAX_AGE_S = 300;

/** Tolerance for a token dated slightly in the future, seconds. */
const CLOCK_SKEW_S = 60;

const HTTP_TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 16_384;
const ALGORITHMS = ['ES256', 'RS256', 'EdDSA'];

/** Why a token was refused: `invalid` (bad token), `stale` (too old) or `unavailable` (no keys to check it). */
type LogoutTokenFailure = 'invalid' | 'stale' | 'unavailable';

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
	sid?: string;
	sub?: string;
	iat: number;
}

interface LogoutTokenOptions {
	/** The configured issuer (EVER_ID_ISSUER_URL). */
	issuer: string;
	/** This app's client id: the token's `aud` must contain it. */
	clientId: string;
	/** Current time in milliseconds, for the claim checks (tests). */
	now?: number;
}

/** How long keys and discovery are reused; the defaults are the values above. */
interface LogoutTokenVerifierSettings {
	jwksCacheMaxAgeMs?: number;
	jwksCooldownMs?: number;
	discoveryTtlMs?: number;
}

interface IssuerKeys {
	issuer: string;
	jwksUrl: string;
	getKey: JWTVerifyGetKey;
	expiresAt: number;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** https, or plain http on the local machine only. */
function isAllowedEndpoint(url: URL): boolean {
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

/** jose's failures that say the keys could not be obtained, as opposed to a bad token. */
function isKeyAvailabilityError(error: unknown): boolean {
	const { code, name } = (error ?? {}) as { code?: string; name?: string };
	// A failed fetch is a TypeError (compared by name: it may come from another realm than this module's).
	return (
		code === 'ERR_JWKS_TIMEOUT' ||
		code === 'ERR_JWKS_INVALID' ||
		code === 'ERR_JOSE_GENERIC' ||
		name === 'TypeError'
	);
}

/** Checks the claims a logout token must (and must not) carry, after its signature was verified. */
function checkLogoutClaims(payload: JWTPayload, nowMs: number): VerifiedLogoutToken {
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
	const claims = payload as Record<string, unknown>;
	const events = claims.events;
	if (!isJsonObject(events) || !isJsonObject(events[BACKCHANNEL_LOGOUT_EVENT])) {
		throw new LogoutTokenError('invalid', 'Logout token carries no back-channel logout event');
	}
	if ('nonce' in claims) {
		throw new LogoutTokenError('invalid', 'A logout token must not carry a nonce');
	}
	const sid = nonEmptyString(claims.sid);
	const sub = nonEmptyString(payload.sub);
	if (!sid && !sub) {
		throw new LogoutTokenError('invalid', 'Logout token names neither a session nor a subject');
	}
	return { jti, sid, sub, iat };
}

/** A verifier with its own key and discovery caches. */
export function createLogoutTokenVerifier(settings: LogoutTokenVerifierSettings = {}) {
	const jwksCacheMaxAgeMs = settings.jwksCacheMaxAgeMs ?? 600_000;
	const jwksCooldownMs = settings.jwksCooldownMs ?? 30_000;
	const discoveryTtlMs = settings.discoveryTtlMs ?? 600_000;
	const issuerKeys = new Map<string, IssuerKeys>();

	/** The issuer's key getter, from its discovery document (cached; a failed discovery is not cached). */
	async function keysFor(configuredIssuer: string): Promise<IssuerKeys> {
		const now = Date.now();
		const cached = issuerKeys.get(configuredIssuer);
		if (cached && cached.expiresAt > now) return cached;

		let document: Record<string, unknown>;
		try {
			const discoveryUrl = new URL(`${configuredIssuer.replace(/\/+$/, '')}/.well-known/openid-configuration`);
			if (!isAllowedEndpoint(discoveryUrl)) throw new Error('the issuer must use https');
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
			throw new LogoutTokenError(
				'unavailable',
				`Issuer discovery failed: ${(error as Error)?.message ?? 'error'}`
			);
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
						cacheMaxAge: jwksCacheMaxAgeMs,
						cooldownDuration: jwksCooldownMs,
						timeoutDuration: HTTP_TIMEOUT_MS
					});
		const keys: IssuerKeys = { issuer, jwksUrl: jwksUrl.href, getKey, expiresAt: now + discoveryTtlMs };
		issuerKeys.set(configuredIssuer, keys);
		return keys;
	}

	/**
	 * Verifies a back-channel logout token.
	 *
	 * @throws LogoutTokenError `invalid`, `stale` or `unavailable`.
	 */
	async function verify(token: string, options: LogoutTokenOptions): Promise<VerifiedLogoutToken> {
		if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || token.split('.').length !== 3) {
			throw new LogoutTokenError('invalid', 'Not a compact JWS');
		}
		const nowMs = options.now ?? Date.now();
		const keys = await keysFor(options.issuer);

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
		return checkLogoutClaims(payload, nowMs);
	}

	return { verify };
}

const defaultVerifier = createLogoutTokenVerifier();

/** Verifies a back-channel logout token with the process-wide key cache. */
export function verifyLogoutToken(token: string, options: LogoutTokenOptions): Promise<VerifiedLogoutToken> {
	return defaultVerifier.verify(token, options);
}
