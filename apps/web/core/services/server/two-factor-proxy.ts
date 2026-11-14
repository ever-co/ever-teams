import { NextResponse } from 'next/server';
import { enabledPermissionsOf } from '@/core/lib/utils/member-access';
import {
	twoFactorConfirmSchema,
	twoFactorEnrollSchema,
	twoFactorProofSchema,
	twoFactorUserIdSchema,
	twoFactorVerifySchema
} from '@/core/lib/validation/two-factor';
import { APP_NAME } from '@/core/constants/config/constants';
import { gauzyErrorResponse } from './gauzy-error-response';
import { authenticatedGuard } from './guards/authenticated-guard-app';
import { getMyRolePermissionsRequest } from './requests/role-permissions';
import {
	confirmTwoFactorRequest,
	disableTwoFactorRequest,
	enrollTwoFactorRequest,
	regenerateRecoveryCodesRequest,
	resetMemberTwoFactorRequest,
	twoFactorStatusRequest,
	verifyTwoFactorRequest
} from './requests/two-factor';
import { respondWithWorkspaceSession } from './workspace-session';

/**
 * Proxy mode twins (no NEXT_PUBLIC_GAUZY_API_SERVER_URL) of Gauzy's two-factor routes, `/api/auth/two-factor/*`.
 * Gauzy's answers and refusals pass through unchanged (a wrong code is its 401, too many codes its 429).
 */

/** The permission Gauzy asks for to reset a member's second factor. */
export const RESET_MEMBER_TWO_FACTOR_PERMISSION = 'ORG_USERS_EDIT';

/** The secrets these answers carry (the authenticator secret, the recovery codes) are never cached on the way. */
const NO_STORE = { 'Cache-Control': 'no-store' };

function invalidBody(message: string): NextResponse {
	return NextResponse.json({ message }, { status: 400, headers: NO_STORE });
}

async function bodyOf(req: Request): Promise<unknown> {
	return req.json().catch(() => null);
}

function withNoStore(response: NextResponse): NextResponse {
	response.headers.set('Cache-Control', 'no-store');
	return response;
}

/** `GET /api/auth/two-factor`: the caller's own state. */
export async function proxyTwoFactorStatus(req: Request): Promise<NextResponse> {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	try {
		const { data } = await twoFactorStatusRequest({ bearer_token: access_token, tenantId, organizationId });
		return NextResponse.json(data, { headers: NO_STORE });
	} catch (error) {
		return withNoStore(await gauzyErrorResponse(error, 'Two-factor authentication could not be read.'));
	}
}

type TwoFactorWrite = 'enroll' | 'confirm' | 'disable' | 'recovery-codes';

/** The signed-in writes: start the setup, confirm it, turn it off, replace the recovery codes. */
export async function proxyTwoFactorWrite(req: Request, write: TwoFactorWrite): Promise<NextResponse> {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	const session = { bearer_token: access_token, tenantId };
	const body = await bodyOf(req);
	try {
		if (write === 'enroll') {
			const parsed = twoFactorEnrollSchema.safeParse(body ?? {});
			if (!parsed.success) return invalidBody('issuer must be 64 characters at most');
			const issuer = parsed.data.issuer || APP_NAME;
			const { data } = await enrollTwoFactorRequest({ ...session, issuer });
			return NextResponse.json(data, { headers: NO_STORE });
		}
		if (write === 'confirm') {
			const parsed = twoFactorConfirmSchema.safeParse(body);
			if (!parsed.success) return invalidBody('code is required');
			const { data } = await confirmTwoFactorRequest({ ...session, code: parsed.data.code });
			return NextResponse.json(data, { headers: NO_STORE });
		}
		const parsed = twoFactorProofSchema.safeParse(body);
		if (!parsed.success) return invalidBody('code or recoveryCode is required');
		if (write === 'disable') {
			const { data } = await disableTwoFactorRequest({ ...session, proof: parsed.data });
			return NextResponse.json(data, { headers: NO_STORE });
		}
		const { data } = await regenerateRecoveryCodesRequest({ ...session, proof: parsed.data });
		return NextResponse.json(data, { headers: NO_STORE });
	} catch (error) {
		return withNoStore(await gauzyErrorResponse(error, 'Two-factor authentication could not be changed.'));
	}
}

/**
 * `DELETE /api/auth/two-factor/users/[userId]`: an administrator turns a member's second factor off. Refused here,
 * before Gauzy, without the permission Gauzy asks for it (`ORG_USERS_EDIT`).
 */
export async function proxyResetMemberTwoFactor(req: Request, userId: string): Promise<NextResponse> {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	const parsedUserId = twoFactorUserIdSchema.safeParse(userId);
	if (!parsedUserId.success) return invalidBody('A user id is required');
	const session = { bearer_token: access_token, tenantId };
	try {
		const { data: permissions } = await getMyRolePermissionsRequest(session);
		const canEditUsers = enabledPermissionsOf(permissions ?? []).includes(RESET_MEMBER_TWO_FACTOR_PERMISSION);
		if (!canEditUsers) {
			return NextResponse.json({ message: 'You may not reset this member.' }, { status: 403 });
		}
		const { data } = await resetMemberTwoFactorRequest({ ...session, userId: parsedUserId.data });
		return NextResponse.json(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'The second factor could not be reset.');
	}
}

/**
 * `POST /api/auth/two-factor/verify` (public): the second step of a sign-in. Gauzy trades the challenge and its code
 * for the session, and this route answers with the session cookies, as the workspace sign-in does.
 */
export async function proxyTwoFactorVerify(req: Request): Promise<NextResponse> {
	const parsed = twoFactorVerifySchema.safeParse(await bodyOf(req));
	if (!parsed.success) return invalidBody('challenge and code or recoveryCode are required');
	const { teamId, ...input } = parsed.data;
	try {
		const { data } = await verifyTwoFactorRequest(input);
		const sessionResponse = await respondWithWorkspaceSession({
			req,
			loginResponse: data,
			teamId: teamId ?? '',
			body: { loginResponse: data }
		});
		if (sessionResponse) {
			return sessionResponse;
		}
		return NextResponse.json(
			{ errors: { email: `Your account is not yet ready to be used on the ${APP_NAME} Platform` } },
			{ status: 400 }
		);
	} catch (error) {
		return gauzyErrorResponse(error, 'The code could not be checked.');
	}
}
