import { NextResponse } from 'next/server';
import { everIdConfirmAttempts } from '@/core/lib/auth/ever-id/attempts';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import {
	clearedEverIdHandoffCookie,
	everIdCookieSecure,
	everIdHandoffFromRequest
} from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import { confirmEverIdLinkRequest, retryWhileBusy } from '@/core/services/server/requests/ever-id';
import type { IEverIdWorkspacesResponse } from '@/core/types/interfaces/auth/ever-id';

/**
 * Completes an Ever ID sign-in that needs Gauzy's one-time e-mail code: the Gauzy API found an existing
 * account with the verified e-mail address of the Ever ID and sent its own code to that mailbox; the
 * account is linked only once the code is entered here.
 *
 * Body `{ code }` (JSON): the code from the e-mail. The one-time key comes from the sealed cookie the sign-in set
 * (never from the page). On success the answer is the workspace list with the team lists (`workspaces`,
 * `confirmed_email`, `total_workspaces`) and the cookie is dropped; the passcode page continues with the usual
 * workspace sign-in. A wrong code answers 400 (the API allows five), a used-up or expired key 410 (the cookie is
 * dropped). While another attempt holds the key (409 `handoff_busy`) the code is tried again after the wait the API
 * asks; a key that is still busy, or tried more than 4 times a minute here or by the API, answers 429 with a
 * Retry-After and keeps the cookie. An attempt the API did not judge is given back. 404 while the Ever ID sign-in is
 * not configured.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 1_024;
const MAX_CODE_LENGTH = 64;

/** The answers of the API that judged the code (an attempt); any other answer gives the attempt back. */
const JUDGED = new Set([200, 401, 410]);

type Reason = 'invalid_code' | 'expired' | 'throttled' | 'unavailable';

function refuse(status: number, reason: Reason, retryAfterS?: number): NextResponse {
	return NextResponse.json(
		{ reason, ...(reason === 'invalid_code' ? { errors: { code: reason } } : {}) },
		{ status, headers: { ...NO_STORE, ...(retryAfterS ? { 'Retry-After': String(retryAfterS) } : {}) } }
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** A workspace the passcode page can sign in with: a non-empty token and a user with an id. */
function isWorkspace(value: unknown): boolean {
	if (!isRecord(value) || typeof value.token !== 'string' || !value.token) return false;
	return isRecord(value.user) && typeof value.user.id === 'string' && !!value.user.id;
}

/** A complete answer: at least one usable workspace and the verified e-mail address the sign-in continues with. */
function isWorkspacesResponse(value: unknown): value is IEverIdWorkspacesResponse {
	return (
		isRecord(value) &&
		Array.isArray(value.workspaces) &&
		value.workspaces.some(isWorkspace) &&
		typeof value.confirmed_email === 'string' &&
		!!value.confirmed_email
	);
}

export async function POST(req: Request) {
	if (!isEverIdConfigured()) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}

	const body = await readCappedJsonObject(req, MAX_BODY_BYTES);
	const handoff = everIdHandoffFromRequest(req, 'confirm');
	const code = typeof body?.code === 'string' ? body.code.trim() : '';
	if (!handoff) {
		return refuse(410, 'expired');
	}
	if (!code || code.length > MAX_CODE_LENGTH) {
		return refuse(400, 'invalid_code');
	}

	const startedAt = Date.now();
	let status = 0;
	const log = (outcome: EverIdStepOutcome) =>
		logEverIdOutcome('ever_id.confirm', { outcome, latencyMs: Date.now() - startedAt, status });
	// The key is used up once the API answered 200 (even malformed) or 410: the browser drops the cookie.
	const withoutKey = (response: NextResponse) => {
		response.cookies.set(clearedEverIdHandoffCookie(everIdCookieSecure(req.headers, req.url)));
		return response;
	};

	const attempt = everIdConfirmAttempts.take(handoff);
	if (!attempt.allowed) {
		log('throttled');
		return refuse(429, 'throttled', attempt.retryAfterS);
	}

	let data: IEverIdWorkspacesResponse | undefined;
	let retryAfter: number | undefined;
	try {
		({ status, data, retryAfter } = await retryWhileBusy(() => confirmEverIdLinkRequest(handoff, code)));
	} catch {
		status = 0;
	}
	if (!JUDGED.has(status)) attempt.giveBack();

	if (status === 200) {
		if (isWorkspacesResponse(data)) {
			log('ok');
			const { workspaces, confirmed_email, total_workspaces } = data;
			return withoutKey(
				NextResponse.json({ workspaces, confirmed_email, total_workspaces }, { status: 200, headers: NO_STORE })
			);
		}
		log('gauzy_error');
		return withoutKey(refuse(502, 'unavailable'));
	}
	switch (status) {
		case 401:
			log('invalid');
			return refuse(400, 'invalid_code');
		case 410:
			log('expired');
			return withoutKey(refuse(410, 'expired'));
		case 409:
		case 429:
			// Still busy after the retries, or the API's rate limit: the key stays valid; try again later.
			log('throttled');
			return refuse(429, 'throttled', retryAfter ?? (status === 409 ? 2 : 60));
		default:
			log('gauzy_error');
			return refuse(502, 'unavailable');
	}
}
