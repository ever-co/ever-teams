import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { everIdSetupAttempts } from '@/core/lib/auth/ever-id/attempts';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import { everIdSetupTarget } from '@/core/lib/auth/ever-id/session';
import { provisionEverIdWorkspace } from '@/core/services/server/ever-id/provision';

/**
 * Finishes the setup of a workspace an Ever ID sign-in lists without a tenant: an account the Gauzy API created
 * for an Ever ID whose setup here did not finish (it failed, or the sign-up was completed by the API after
 * checkout). Instead of refusing it ("account not ready"), the chooser resumes the register route's usual steps
 * (tenant, organization, employee, team) and the person is signed in.
 *
 * Body `{ workspace, team?, timezone? }` (JSON): the chooser's index of that workspace, and optionally the team name
 * ("<name>'s Team" by default) and the person's time zone. The workspace token is read from the Ever ID sign-in's
 * next-auth session on this server, never from the page. 404 while the Ever ID sign-in is not configured; 400 for
 * anything but a workspace without a tenant in that session; 410 when there is no such session or its workspace
 * token expired (sign in with Ever ID again); 409 when the account already has its workspace; 429 (with a
 * Retry-After) after 3 attempts a minute for one workspace; 502 when the API fails.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 1_024;

type Reason = 'invalid' | 'expired' | 'has_workspace' | 'throttled' | 'unavailable';

function refuse(status: number, reason: Reason, retryAfterS?: number): NextResponse {
	const headers = retryAfterS ? { ...NO_STORE, 'Retry-After': String(retryAfterS) } : NO_STORE;
	return NextResponse.json({ reason }, { status, headers });
}

function teamName(value: unknown): string | undefined {
	const name = typeof value === 'string' ? value.trim() : '';
	return name.length >= 2 ? name.slice(0, 100) : undefined;
}

export async function POST(req: Request) {
	if (!isEverIdConfigured()) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}
	const body = await readCappedJsonObject(req, MAX_BODY_BYTES);
	const index = body?.workspace;
	if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
		return refuse(400, 'invalid');
	}
	const session = await auth();
	if (!session) {
		return refuse(410, 'expired');
	}
	const target = everIdSetupTarget(session, index);
	if (!target) {
		return refuse(400, 'invalid');
	}

	const startedAt = Date.now();
	const log = (outcome: EverIdStepOutcome) =>
		logEverIdOutcome('ever_id.setup', { outcome, latencyMs: Date.now() - startedAt });

	const attempt = everIdSetupAttempts.take(target.token);
	if (!attempt.allowed) {
		log('throttled');
		return refuse(429, 'throttled', attempt.retryAfterS);
	}

	const response = NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
	const result = await provisionEverIdWorkspace({
		req,
		response,
		email: target.email,
		workspaceToken: target.token,
		fallbackUserId: target.userId,
		team: teamName(body?.team),
		timezone: typeof body?.timezone === 'string' ? body.timezone.slice(0, 64) : undefined
	});
	switch (result) {
		case 'ok':
			log('ok');
			return response;
		case 'token_expired':
			log('expired');
			return refuse(410, 'expired');
		case 'has_workspace':
			log('invalid');
			return refuse(409, 'has_workspace');
		default:
			log('gauzy_error');
			return refuse(502, 'unavailable');
	}
}
