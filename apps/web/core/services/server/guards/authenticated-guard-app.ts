import {
	ACTIVE_PROJECT_COOKIE_NAME,
	ACTIVE_TASK_COOKIE_NAME,
	ACTIVE_TEAM_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME
} from '@/core/constants/config/constants';
import { requestAccessToken, requestCookies } from '../request-cookies';
import { currentAuthenticatedUserRequest } from '../requests/auth';
import { unwrapRejection } from '../fetch';
import { NextResponse } from 'next/server';
import { resolveSessionCheckMemoTtl, SessionCheckMemo } from './session-check-memo';

type SessionCheck = Awaited<ReturnType<typeof currentAuthenticatedUserRequest>>;

/**
 * Whether a session check authenticated the caller: a 2xx with a body that is not Gauzy's 401 envelope. A 2xx with
 * an empty or unreadable body leaves `data` undefined, and a check that failed leaves no answer at all: neither
 * authenticated.
 */
const authenticated = (check: SessionCheck | void): check is SessionCheck =>
	!!check?.data && (check.data as any).statusCode !== 401;

/**
 * The session checks of recent tokens, shared by every `app/api/*` route of this server process for
 * SESSION_CHECK_MEMO_TTL_MS (5 s unless set; 0 turns it off). See SessionCheckMemo.
 */
export const sessionChecks = new SessionCheckMemo<SessionCheck>(
	resolveSessionCheckMemoTtl(process.env.SESSION_CHECK_MEMO_TTL_MS)
);

export interface AuthenticatedGuardOptions {
	/**
	 * Check the token against the Gauzy API now, whatever recent check this process holds for it. For a route that
	 * is its own authorization boundary because it signs a credential with a server secret (`auth/meet/jwt`,
	 * `livekit`): a token revoked seconds ago must not be turned into a new credential on the strength of a
	 * check made before the revocation.
	 */
	fresh?: boolean;
}

/**
 * Authenticates an `app/api` request: it checks the access token against the Gauzy API (`/user/me`) and
 * returns it with the tenant, organization, team, task and project ids read from the caller's cookies.
 *
 * It does not authorize the resource a route acts on, by design. A route that forwards the caller's token to
 * the Gauzy API leaves authorization to it: the Gauzy API decides from the caller's role and permissions
 * whether an id sent by the client may be read or changed. Do not add an ownership or membership check here
 * or in such a route: the token is readable in the browser and can be sent to the Gauzy API directly, so the
 * check protects nothing, and it would block the legitimate reads of managers and admins on other members.
 * A route that signs its own token with a server secret (`auth/meet/jwt`, `livekit`) is its own authorization
 * boundary and must authorize the caller itself. See "API routes and authorization" in apps/web/README.md.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the routes still pass their response; the cookies come from the request
export async function authenticatedGuard(req: Request, res: NextResponse<unknown>, options: AuthenticatedGuardOptions = {}) {
	const cookies = requestCookies(req);
	const access_token = requestAccessToken(cookies);
	const tenantId = cookies.get(TENANT_ID_COOKIE_NAME) as string;
	const organizationId = cookies.get(ORGANIZATION_ID_COOKIE_NAME) as string;
	const teamId = cookies.get(ACTIVE_TEAM_COOKIE_NAME) as string;
	const taskId = cookies.get(ACTIVE_TASK_COOKIE_NAME) as string;
	const projectId = cookies.get(ACTIVE_PROJECT_COOKIE_NAME) as string;

	let rejection: { statusCode?: number; message?: string } | undefined;
	const bearer_token = access_token?.toString() || '';
	const check = (signal: AbortSignal) => currentAuthenticatedUserRequest({ bearer_token, signal });
	// Routes called within the same few seconds with the same token share one check (see SessionCheckMemo), unless
	// the route asks for a fresh one; either way the check runs under the memo's deadline.
	const r_res: SessionCheck | void = await (options.fresh
		? sessionChecks.withDeadline(check)
		: sessionChecks.answer(bearer_token, check, authenticated)
	).catch(async (error: unknown) => {
		const reason = await unwrapRejection(error);
		rejection = reason && typeof reason === 'object' ? reason : undefined;
		console.error(reason);
	});

	// A 2xx with an empty or unreadable body leaves data undefined: treat it as a check without an answer.
	if (!authenticated(r_res)) {
		// The browser clients re-authenticate on the HTTP status, so the refusal carries Gauzy's own status
		// (401, 404, 429...). A check that never got a usable answer is a 503: an outage must not look like an
		// expired session that the client should log out.
		const upstream: { statusCode?: number; message?: string } | undefined = rejection ?? (r_res?.data as any);
		const status =
			typeof upstream?.statusCode === 'number' && upstream.statusCode >= 400 ? upstream.statusCode : 503;
		return {
			$res: (data: any) => NextResponse.json({ statusCode: status, message: data }, { status }),
			user: null,
			status,
			deny: () =>
				NextResponse.json(
					{
						message:
							status === 503 ? 'Session check unavailable, retry later' : upstream?.message || 'Unauthorized'
					},
					{ status }
				)
		};
	}

	return {
		$res: (data: any) => NextResponse.json(data),
		user: r_res.data,
		access_token: access_token as string,
		tenantId,
		organizationId,
		teamId,
		taskId,
		projectId
	};
}
