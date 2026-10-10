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

export async function authenticatedGuard(req: Request, res: NextResponse<unknown>) {
	const access_token = getAccessTokenCookie({ req, res });
	const tenantId = getTenantIdCookie({ req, res });
	const organizationId = getOrganizationIdCookie({ req, res });
	const teamId = getActiveTeamIdCookie({ req, res });
	const taskId = getActiveTaskIdCookie({ req, res });
	const projectId = getActiveProjectIdCookie({ req, res });

	let rejection: { statusCode?: number } | undefined;
	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token?.toString() || ''
	}).catch(async (error: unknown) => {
		const reason = await unwrapRejection(error);
		rejection = reason && typeof reason === 'object' ? reason : undefined;
		console.error(reason);
	});

	// A 2xx with an empty or unreadable body leaves data undefined: treat it as a check without an answer.
	if (!r_res?.data || (r_res.data as any).statusCode === 401) {
		// The browser clients re-authenticate on the HTTP status, so the refusal carries Gauzy's own status.
		// A check that never got a usable answer is a 503: an outage must not look like an expired session.
		const upstreamStatus = (rejection ?? (r_res?.data as any))?.statusCode;
		const status = typeof upstreamStatus === 'number' && upstreamStatus >= 400 ? upstreamStatus : 503;
		return {
			$res: (data: any) => NextResponse.json({ statusCode: status, message: data }, { status }),
			user: null
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
