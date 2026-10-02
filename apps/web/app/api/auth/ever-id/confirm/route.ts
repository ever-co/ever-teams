import { NextResponse } from 'next/server';
import { everIdConfirmAttempts } from '@/core/lib/auth/ever-id/attempts';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { clearedEverIdHandoffCookie, everIdHandoffFromRequest, isHttpsRequest } from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import { confirmEverIdLinkRequest } from '@/core/services/server/requests/ever-id';
import type { IEverIdWorkspacesResponse } from '@/core/types/interfaces/auth/ever-id';

/**
 * Completes an Ever ID sign-in that needs Gauzy's one-time e-mail code: the Gauzy API found an existing
 * account with the verified e-mail address of the Ever ID and sent its own code to that mailbox; the
 * account is linked only once the code is entered here.
 *
 * Body `{ code }` (JSON): the code from the e-mail. The one-time key comes from the sealed cookie the sign-in set
 * (never from the page). On success the answer is the workspace list and the cookie is dropped; the passcode
 * page continues with the usual workspace sign-in. A wrong code answers 400 (the API allows five tries), a
 * used-up or expired key 410, too many attempts 429. 404 while the Ever ID sign-in is not configured.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 1_024;
const MAX_CODE_LENGTH = 64;

type Reason = 'invalid_code' | 'expired' | 'throttled' | 'unavailable';

function refuse(status: number, reason: Reason): NextResponse {
	return NextResponse.json(
		{ reason, ...(reason === 'invalid_code' ? { errors: { code: reason } } : {}) },
		{ status, headers: NO_STORE }
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

	if (!everIdConfirmAttempts.take(handoff)) {
		log('throttled');
		return refuse(429, 'throttled');
	}

	let data: IEverIdWorkspacesResponse | undefined;
	try {
		({ status, data } = await confirmEverIdLinkRequest(handoff, code));
	} catch {
		status = 0;
	}

	// The key is used up once the API answered 200 (even malformed) or 410: the browser drops the cookie.
	const withoutKey = (response: NextResponse) => {
		response.cookies.set(clearedEverIdHandoffCookie(isHttpsRequest(req.headers, req.url)));
		return response;
	};
	if (status === 200) {
		if (isWorkspacesResponse(data)) {
			log('ok');
			return withoutKey(NextResponse.json(data, { status: 200, headers: NO_STORE }));
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
		case 429:
			log('throttled');
			return refuse(429, 'throttled');
		default:
			log('gauzy_error');
			return refuse(502, 'unavailable');
	}
}
