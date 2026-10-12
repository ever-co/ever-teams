import {
	getAccessTokenCookie,
	getActiveProjectIdCookie,
	getActiveTaskIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { currentAuthenticatedUserRequest } from '../requests/auth';
import { NextResponse } from 'next/server';

// serverFetch rejects a non-2xx answer with Promise.reject(data), so Gauzy's error body sits inside
// that promise; a network failure rejects with a plain error that carries no status code.
async function unwrapRejection(error: unknown): Promise<unknown> {
	if (!(error instanceof Promise)) return error;
	try {
		return await error;
	} catch (error_) {
		return error_;
	}
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
export async function authenticatedGuard(req: Request, res: NextResponse<unknown>) {
	const access_token = getAccessTokenCookie({ req, res });
	const tenantId = getTenantIdCookie({ req, res });
	const organizationId = getOrganizationIdCookie({ req, res });
	const teamId = getActiveTeamIdCookie({ req, res });
	const taskId = getActiveTaskIdCookie({ req, res });
	const projectId = getActiveProjectIdCookie({ req, res });

	let rejection: { statusCode?: number; message?: string } | undefined;
	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token?.toString() || ''
	}).catch(async (error: unknown) => {
		const reason = await unwrapRejection(error);
		rejection = reason && typeof reason === 'object' ? reason : undefined;
		console.error(reason);
	});

	// A 2xx with an empty or unreadable body leaves data undefined: treat it as a check without an answer.
	if (!r_res?.data || (r_res.data as any).statusCode === 401) {
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
