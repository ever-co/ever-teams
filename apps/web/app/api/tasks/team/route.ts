import { getActiveTeamIdCookie } from '@app/helpers/cookies';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { createTaskRequest, getTeamTasksRequest } from '@app/services/server/requests';
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
