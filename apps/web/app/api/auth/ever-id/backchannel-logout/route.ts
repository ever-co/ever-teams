import { NextResponse } from 'next/server';
import { readCappedText } from '@/core/lib/auth/ever-id/body';
import { getEverIdConfig } from '@/core/lib/auth/ever-id/config';
import { logoutJtiCache } from '@/core/lib/auth/ever-id/jti-cache';
import { logEverIdOutcome } from '@/core/lib/auth/ever-id/log';
import { LogoutTokenError, verifyLogoutToken } from '@/core/lib/auth/ever-id/logout-token';
import { forwardEverIdLogoutRequest } from '@/core/services/server/requests/ever-id';

/**
 * OpenID Connect back-channel logout for the Ever ID sign-in: the identity provider posts a logout token
 * here when the person signs out there (for example "sign out everywhere").
 *
 * A valid token is forwarded to the Gauzy API, which ends the sessions opened through that Ever ID session: it
 * revokes their refresh tokens, so they cannot be renewed (an access token already issued stays valid until it
 * expires, as the API documents). This route answers:
 * - 404 while the Ever ID sign-in is not configured;
 * - 400 for anything that is not a form-encoded, valid, fresh logout token for this app, and for a replay;
 * - 503 when the issuer's keys cannot be obtained to check the token or do not include its key (yet: logged as
 *   `unknown_key`), or when the API cannot be reached, limits the
 *   rate (429) or fails (5xx, timeout): the token is then forgotten here, so the identity provider can send it again;
 * - 200 for a valid token the API accepted, and for one the API refused (other 4xx: sending it again would not
 *   help; logged as a failed forward).
 * Neither the token nor anything it names is ever logged.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 32_768;
const NO_STORE = { 'Cache-Control': 'no-store' };

function answer(status: number): NextResponse {
	return new NextResponse(null, { status, headers: NO_STORE });
}

/** The logout token of a form-encoded body of reasonable size (capped while it is read), or `null`. */
async function readLogoutToken(req: Request): Promise<string | null> {
	const contentType = req.headers.get('content-type') ?? '';
	if (!/^application\/x-www-form-urlencoded\b/i.test(contentType)) return null;
	const body = await readCappedText(req, MAX_BODY_BYTES);
	if (!body) return null;
	return new URLSearchParams(body).get('logout_token') || null;
}

/** An answer of the API that a later delivery of the same token may change: unreachable, rate limit, 5xx. */
function isRetryable(status: number): boolean {
	return status === 0 || status === 429 || status >= 500;
}

/** Forwards a verified token to the API; the HTTP status of its answer, 0 when it could not be reached. */
async function forward(logoutToken: string): Promise<number> {
	try {
		return (await forwardEverIdLogoutRequest(logoutToken)).status;
	} catch {
		return 0;
	}
}

export async function POST(req: Request) {
	const config = getEverIdConfig();
	if (!config) {
		return answer(404);
	}
	const startedAt = Date.now();
	const refuse = (outcome: 'invalid' | 'stale' | 'replay' | 'unavailable' | 'unknown_key', status = 400) => {
		logEverIdOutcome('ever_id.backchannel', { outcome, latencyMs: Date.now() - startedAt });
		return answer(status);
	};

	const logoutToken = await readLogoutToken(req);
	if (!logoutToken) {
		return refuse('invalid');
	}

	let jti: string;
	try {
		({ jti } = await verifyLogoutToken(logoutToken, { issuer: config.issuer, clientId: config.clientId }));
	} catch (error) {
		const reason = error instanceof LogoutTokenError ? error.reason : 'invalid';
		if (reason === 'unavailable' || reason === 'unknown_key') {
			return refuse(reason, 503);
		}
		return refuse(reason === 'stale' ? 'stale' : 'invalid');
	}

	if (logoutJtiCache.seen(jti)) {
		return refuse('replay');
	}

	const status = await forward(logoutToken);
	const forwarded = status >= 200 && status < 300;
	logEverIdOutcome('ever_id.backchannel', {
		outcome: forwarded ? 'ok' : 'forward_failed',
		latencyMs: Date.now() - startedAt,
		status
	});
	// The API could not end the sessions (unreachable, timed out, rate limit, 5xx): the identity provider may retry.
	if (!forwarded && isRetryable(status)) {
		logoutJtiCache.forget(jti);
		return answer(503);
	}
	return answer(200);
}
