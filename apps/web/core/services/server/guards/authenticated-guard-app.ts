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

export async function authenticatedGuard(req: Request, res: NextResponse<unknown>) {
	const access_token = getAccessTokenCookie({ req, res });
	const tenantId = getTenantIdCookie({ req, res });
	const organizationId = getOrganizationIdCookie({ req, res });
	const teamId = getActiveTeamIdCookie({ req, res });
	const taskId = getActiveTaskIdCookie({ req, res });
	const projectId = getActiveProjectIdCookie({ req, res });

	// serverFetch rejects a non-2xx answer with Promise.reject(data), so Gauzy's error body sits inside
	// that promise; a network failure rejects with a plain error that carries no status code.
	let rejection: { statusCode?: number; message?: string } | undefined;
	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token?.toString() || ''
	}).catch(async (error: unknown) => {
		const reason = error instanceof Promise ? await error.catch((data) => data) : error;
		rejection = reason && typeof reason === 'object' ? reason : undefined;
		console.error(reason);
	});

	if (!r_res || (r_res.data as any).statusCode === 401) {
		// Keep Gauzy's own status (401, 404, 429...); only a check that never got an answer is a 503, so
		// an outage never looks like an expired session that the client should log out.
		const upstream: { statusCode?: number; message?: string } | undefined = rejection ?? (r_res?.data as any);
		const status =
			typeof upstream?.statusCode === 'number' && upstream.statusCode >= 400 ? upstream.statusCode : 503;
		return {
			$res: (data: any) => NextResponse.json({ statusCode: 401, message: data }),
			user: null,
			status,
			deny: () =>
				NextResponse.json(
					{
						message:
							status === 503
								? 'Session check unavailable, retry later'
								: upstream?.message || 'Unauthorized'
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
