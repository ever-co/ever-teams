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

	// serverFetch rejects a non-2xx answer with Promise.reject(data), so Gauzy's status code sits inside
	// that promise; a network failure rejects with a plain error that carries no status code.
	let rejectedStatus: number | undefined;
	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token?.toString() || ''
	}).catch(async (error: unknown) => {
		const reason = error instanceof Promise ? await error.catch((data) => data) : error;
		rejectedStatus = (reason as { statusCode?: number } | undefined)?.statusCode;
		console.error(reason);
	});

	if (!r_res || (r_res.data as any).statusCode === 401) {
		// True when Gauzy rejected the token itself; false when the check could not be completed.
		const unauthorized = rejectedStatus === 401 || (r_res?.data as any)?.statusCode === 401;
		return {
			$res: (data: any) => NextResponse.json({ statusCode: 401, message: data }),
			user: null,
			unauthorized,
			// 401 only when the token was rejected: answering 401 to a failed check would make the
			// client log the user out during a Gauzy outage.
			deny: () =>
				unauthorized
					? NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
					: NextResponse.json({ message: 'Session check unavailable, retry later' }, { status: 503 })
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
