import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createTaskRequest, getTeamTasksIRequest, getTeamTasksRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token, projectId, teamId } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res('Unauthorized');

	const body: Record<string, any> = (await req.json()) || {};

	const title = body.title?.trim() || '';

	if (title.trim().length < 2) {
		return $res({ errors: { name: 'Invalid task name !' } });
	}

	const activeTeam = getActiveTeamIdCookie({ req, res });

	await createTaskRequest({
		bearer_token: access_token,
		data: {
			description: '',
			status: 'open',
			members: user?.employee?.id ? [{ id: user.employee.id }] : [],
			teams: [
				{
					id: activeTeam
				}
			],
			tags: [],
			organizationId,
			tenantId,
			projectId,
			estimate: 0,
			...body,
			title // this must be called after ...body
		}
	});

	const { data: tasks } = await getTeamTasksRequest({
		tenantId,
		organizationId,
		projectId,
		teamId,
		bearer_token: access_token
	});

	return $res(tasks);
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token } = await authenticatedGuard(req, res);

	const query = new URL(req.url);

	if (!user) {
		return $res('Unauthorized');
	}

	const { data: tasks } = await getTeamTasksIRequest({
		tenantId,
		bearer_token: access_token,
		query: query.searchParams.toString()
	});

	return $res(tasks);
}
