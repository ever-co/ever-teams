import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { AUTH_SECRET, developmentAuthSecret, isDevelopment } from '@/core/constants/config/constants';
import type { EverIdStep } from './step';

/**
 * The Ever ID hand-off key (server side): an opaque one-time key the Gauzy API issues when an Ever ID sign-in
 * continues on another page (Gauzy's one-time e-mail code, or the sign-up confirmation).
 *
 * It never goes into a URL. The sign-in callback seals it with AES-256-GCM, under a key derived from
 * AUTH_SECRET, together with its step and an expiry, into an httpOnly, SameSite=Lax cookie scoped to /api/auth;
 * the page only gets the step marker (step.ts). The routes of that step open the cookie: a value this server did
 * not seal, of another step or past its expiry is no key at all, and the Gauzy API is not called.
 */

const EVER_ID_HANDOFF_COOKIE = 'ever-id-handoff';

/** Only the routes that use the key receive the cookie: /api/auth/ever-id/* and the sign-up (/api/auth/register). */
const COOKIE_PATH = '/api/auth';

/** Long enough to read the e-mail or fill in the sign-up form; the API's own key lifetime still applies. */
const MAX_AGE_S = 1800;

/** The API issues 43 base64url characters; anything far outside that shape is not a key. */
const HANDOFF_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAX_SEALED_LENGTH = 1024;

interface EverIdHandoffCookie {
	name: string;
	value: string;
	httpOnly: true;
	sameSite: 'lax';
	secure: boolean;
	path: string;
	maxAge: number;
}

/** The key when `value` has the shape of one, otherwise `null`. */
export function readEverIdHandoff(value: unknown): string | null {
	return typeof value === 'string' && HANDOFF_PATTERN.test(value) ? value : null;
}

let derived: { secret: string; key: Buffer } | undefined;

/** The sealing key, derived from the secret next-auth uses; `null` when none is configured. */
function sealingKey(): Buffer | null {
	const secret = AUTH_SECRET || (isDevelopment ? developmentAuthSecret : '');
	if (!secret) return null;
	if (derived?.secret !== secret) {
		derived = { secret, key: Buffer.from(hkdfSync('sha256', secret, 'ever-teams/ever-id-handoff', 'v1', 32)) };
	}
	return derived.key;
}

/** The cookie value carrying `handoff` for `step`, or `null` when there is no secret to seal it with. */
export function sealEverIdHandoff(handoff: string, step: EverIdStep, now = Date.now()): string | null {
	const key = sealingKey();
	if (!key || !readEverIdHandoff(handoff)) return null;
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
	const sealed = Buffer.concat([
		cipher.update(JSON.stringify({ k: handoff, s: step, e: now + MAX_AGE_S * 1000 }), 'utf8'),
		cipher.final()
	]);
	return Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64url');
}

/** The key a cookie value carries for `step`, or `null` (not sealed here, another step, expired or malformed). */
export function openEverIdHandoff(
	sealed: string | null | undefined,
	step: EverIdStep,
	now = Date.now()
): string | null {
	const key = sealingKey();
	if (!key || typeof sealed !== 'string' || !sealed || sealed.length > MAX_SEALED_LENGTH) return null;
	try {
		const raw = Buffer.from(sealed, 'base64url');
		if (raw.length <= IV_BYTES + TAG_BYTES) return null;
		const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
		decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
		const opened = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
		const payload = JSON.parse(opened.toString('utf8')) as { k?: unknown; s?: unknown; e?: unknown };
		if (payload.s !== step || typeof payload.e !== 'number' || payload.e <= now) return null;
		return readEverIdHandoff(payload.k);
	} catch {
		return null;
	}
}

/** The cookie that carries a sealed key to the routes of its step. */
export function everIdHandoffCookie(sealed: string, secure: boolean): EverIdHandoffCookie {
	return {
		name: EVER_ID_HANDOFF_COOKIE,
		value: sealed,
		httpOnly: true,
		sameSite: 'lax',
		secure,
		path: COOKIE_PATH,
		maxAge: MAX_AGE_S
	};
}

/** The same cookie, expired: once a step is done (or its key used up) the browser drops it. */
export function clearedEverIdHandoffCookie(secure: boolean): EverIdHandoffCookie {
	return { ...everIdHandoffCookie('', secure), maxAge: 0 };
}

/** Whether a request reached this app over https (directly, or through a proxy that says so). */
export function isHttpsRequest(headers: Headers, url?: string): boolean {
	const forwarded = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
	if (forwarded) return forwarded === 'https';
	try {
		return !!url && new URL(url).protocol === 'https:';
	} catch {
		return false;
	}
}

function cookieValue(header: string | null, name: string): string | undefined {
	for (const part of (header ?? '').split(';')) {
		const separator = part.indexOf('=');
		if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
	}
	return undefined;
}

/** The key of `step` that the request's cookie carries, or `null`. */
export function everIdHandoffFromRequest(req: Request, step: EverIdStep): string | null {
	return openEverIdHandoff(cookieValue(req.headers.get('cookie'), EVER_ID_HANDOFF_COOKIE), step);
}
