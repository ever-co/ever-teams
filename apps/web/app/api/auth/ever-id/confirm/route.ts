import { NextResponse } from 'next/server';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { readEverIdHandoff } from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome } from '@/core/lib/auth/ever-id/log';
import { confirmEverIdLinkRequest } from '@/core/services/server/requests/ever-id';
import type { IEverIdWorkspacesResponse } from '@/core/types/interfaces/auth/ever-id';

/**
 * Completes an Ever ID sign-in that needs Gauzy's one-time e-mail code: the Gauzy API found an existing
 * account with the verified e-mail address of the Ever ID and sent its own code to that mailbox; the
 * account is linked only once the code is entered here.
 *
 * Body `{ handoff, code }`: the one-time key from the sign-in redirect and the code from the e-mail. On
 * success the answer is the workspace list, and the passcode page continues with the usual workspace
 * sign-in. A wrong code answers 400 (the API allows five tries), a used-up or expired key 410.
 * 404 while the Ever ID sign-in is not configured.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_CODE_LENGTH = 64;

type Reason = 'invalid_code' | 'expired' | 'throttled' | 'unavailable';

function refuse(status: number, reason: Reason): NextResponse {
	return NextResponse.json(
		{ reason, ...(reason === 'invalid_code' ? { errors: { code: reason } } : {}) },
		{ status, headers: NO_STORE }
	);
}

function isWorkspacesResponse(value: unknown): value is IEverIdWorkspacesResponse {
	return !!value && typeof value === 'object' && Array.isArray((value as IEverIdWorkspacesResponse).workspaces);
}

export async function POST(req: Request) {
	if (!isEverIdConfigured()) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}

	const body = (await req.json().catch(() => null)) as { handoff?: unknown; code?: unknown } | null;
	const handoff = readEverIdHandoff(typeof body?.handoff === 'string' ? body.handoff : null);
	const code = typeof body?.code === 'string' ? body.code.trim() : '';
	if (!handoff || !code || code.length > MAX_CODE_LENGTH) {
		return refuse(400, 'invalid_code');
	}

	const startedAt = Date.now();
	let status = 0;
	let data: IEverIdWorkspacesResponse | undefined;
	try {
		({ status, data } = await confirmEverIdLinkRequest(handoff, code));
	} catch {
		status = 0;
	}
	const log = (outcome: 'ok' | 'invalid' | 'expired' | 'throttled' | 'gauzy_error') =>
		logEverIdOutcome('ever_id.confirm', { outcome, latencyMs: Date.now() - startedAt, status });

	if (status === 200 && isWorkspacesResponse(data)) {
		log('ok');
		return NextResponse.json(data, { status: 200, headers: NO_STORE });
	}
	switch (status) {
		case 401:
			log('invalid');
			return refuse(400, 'invalid_code');
		case 410:
			log('expired');
			return refuse(410, 'expired');
		case 429:
			log('throttled');
			return refuse(429, 'throttled');
		default:
			log('gauzy_error');
			return refuse(502, 'unavailable');
	}
}
