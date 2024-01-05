import {
	getAccessTokenCookie,
	getActiveProjectIdCookie,
	getActiveTaskIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@app/helpers/cookies';
import { currentAuthenticatedUserRequest } from '../requests/auth';
import { NextResponse } from 'next/server';

export async function authenticatedGuard(req: Request, res: NextResponse<unknown>) {
	const access_token = getAccessTokenCookie({ req, res });
	const tenantId = getTenantIdCookie({ req, res });
	const organizationId = getOrganizationIdCookie({ req, res });
	const teamId = getActiveTeamIdCookie({ req, res });
	const taskId = getActiveTaskIdCookie({ req, res });
	const projectId = getActiveProjectIdCookie({ req, res });

	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token?.toString() || ''
	}).catch(console.error);

	if (!r_res || (r_res.data as any).statusCode === 401) {
		return {
			$res: () => Response.json({ statusCode: 401, message: 'Unauthorized' }),
			user: null
		};
	}

	return {
		$res: res,
		user: r_res.data,
		access_token: access_token as string,
		tenantId,
		organizationId,
		teamId,
		taskId,
		projectId
	};
}
