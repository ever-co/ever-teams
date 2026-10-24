import { NextResponse } from 'next/server';
import { everIdSetupAttempts } from '@/core/lib/auth/ever-id/attempts';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import { finishSignupWorkspace } from '@/core/services/server/finish-signup';

/**
 * POST /api/auth/finish-setup `{ email, token, timezone? }`: sets up the workspace of a confirmed account that has
 * none yet (an e-mail sign-up confirmed after the register route answered "check your e-mail") and signs it in. Used
 * by the direct API mode, whose workspace sign-in runs in the browser; the proxy mode does it in signin-workspace.
 *
 * The workspace token comes from Gauzy's own sign-in (e-mail code or password), so it is the proof; Gauzy checks it.
 * 400 for a body without both; 409 when there is nothing to set up (the account has a workspace, or a tenant it does
 * not own); 410 when the workspace token expired (sign in again); 429 after 3 attempts a minute for one token; 502
 * when the API fails.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 4_096;

export async function POST(req: Request) {
	const body = await readCappedJsonObject(req, MAX_BODY_BYTES);
	const email = typeof body?.email === 'string' ? body.email.trim() : '';
	const token = typeof body?.token === 'string' ? body.token.trim() : '';
	if (!email || !token) {
		return NextResponse.json({ reason: 'invalid' }, { status: 400, headers: NO_STORE });
	}

	const attempt = everIdSetupAttempts.take(token);
	if (!attempt.allowed) {
		return NextResponse.json(
			{ reason: 'throttled' },
			{ status: 429, headers: { ...NO_STORE, 'Retry-After': String(attempt.retryAfterS) } }
		);
	}

	const response = NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
	const result = await finishSignupWorkspace({
		req,
		response,
		email,
		workspaceToken: token,
		timezone: typeof body?.timezone === 'string' ? body.timezone.slice(0, 64) : undefined
	});
	switch (result) {
		case 'ok':
			return response;
		case 'has_workspace':
			return NextResponse.json({ reason: 'has_workspace' }, { status: 409, headers: NO_STORE });
		case 'token_expired':
			return NextResponse.json({ reason: 'expired' }, { status: 410, headers: NO_STORE });
		default:
			return NextResponse.json({ reason: 'unavailable' }, { status: 502, headers: NO_STORE });
	}
}
