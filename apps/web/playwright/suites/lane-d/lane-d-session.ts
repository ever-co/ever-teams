import { createHash } from 'node:crypto';

import type { StubRequest } from '../../helpers';

/**
 * The signed-in shape lane-d's cases use.
 *
 * `helpers.authCookieNames` builds one session for the whole run and its token is the same every test. That is right
 * for the suites that use it and wrong for gate cases: `session-check-memo.ts` reuses one check per token for 5 s and
 * `mockReset()` does not clear it (the hazard `suites/lane-c/session-check.spec.ts` writes down), so a second case
 * with the same token can inherit the first case's answer and a "the door asked the API" assertion then reads as a
 * missing read. Each lane-d case therefore mints its own token — the same claims and shape as
 * `helpers.syntheticAccessToken` (`helpers.ts:166-170`), a `jti` of its own — and can name the exact sha256 the mock
 * should have recorded (`cypress/support/mock-gauzy-server.mjs:1054`).
 */

function base64Url(value: object): string {
	return Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

export function mintAccessToken(userId: string, organizationId: string, jti: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti };
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.lane-d`;
}

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** The fixture session header with only `auth-token` swapped for a freshly minted one. */
export function freshSessionCookie(
	cookieHeader: string,
	userId: string,
	organizationId: string,
	jti: string
): { header: string; token: string } {
	const token = mintAccessToken(userId, organizationId, jti);
	const replaced = cookieHeader.replace(/auth-token=[^;]+/, `auth-token=${token}`);
	if (replaced === cookieHeader) {
		throw new Error(`the session header held no auth-token to replace: ${cookieHeader}`);
	}
	return { header: replaced, token };
}

/** A mock request log as readable lines, for an assertion message that quotes what actually happened. */
export const logLines = (log: StubRequest[]): string[] =>
	log.map((request) => `${request.method} ${request.path} ${request.status}`);
