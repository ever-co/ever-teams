import {
	ACTIVE_PROJECT_COOKIE_NAME,
	ACTIVE_TASK_COOKIE_NAME,
	ACTIVE_TEAM_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME
} from '@/core/constants/config/constants';
import { NextApiRequest, NextApiResponse } from 'next';
import { requestAccessToken } from '../request-cookies';
import { currentAuthenticatedUserRequest } from '../requests/auth';

/**
 * The pages-router twin of `authenticated-guard-app.ts` (no route uses it today).
 *
 * It read the cookies through the cookies helper, whose getters answer a promise on the server (cookies-next 6): the
 * token came back empty and every caller was refused, and the ids it returned were promises. It now reads them from
 * `req.cookies`, the way the app guard reads the request's `Cookie` header.
 */
export async function authenticatedGuard(req: NextApiRequest, res: NextApiResponse) {
	const cookies = new Map(
		Object.entries(req.cookies ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
	);
	const access_token = requestAccessToken(cookies);
	const tenantId = cookies.get(TENANT_ID_COOKIE_NAME) as string;
	const organizationId = cookies.get(ORGANIZATION_ID_COOKIE_NAME) as string;
	const teamId = cookies.get(ACTIVE_TEAM_COOKIE_NAME) as string;
	const taskId = cookies.get(ACTIVE_TASK_COOKIE_NAME) as string;
	const projectId = cookies.get(ACTIVE_PROJECT_COOKIE_NAME) as string;

	const r_res = await currentAuthenticatedUserRequest({
		bearer_token: access_token || ''
	}).catch(console.error);

	if (!r_res || (r_res.data as any).statusCode === 401) {
		res.status(401);
		return {
			$res: () => res.json({ statusCode: 401, message: 'Unauthorized' }),
			user: null
		};
	}

	res.status(200);

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
