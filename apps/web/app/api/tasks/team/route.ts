import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createTaskRequest, getTeamTasksIRequest, getTeamTasksRequest } from '@/core/services/server/requests';
import { taskSchema } from '@/core/types/schemas/task/task.schema';
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

	const { data: createdTask } = await createTaskRequest({
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

	// The task exists from here on. A failed list refresh must not become a 500 that reads as a failed
	// creation, or the user retries and creates it twice; the client refreshes the task lists on success.
	try {
		const { data: tasks } = await getTeamTasksRequest({
			tenantId,
			organizationId,
			projectId,
			teamId,
			bearer_token: access_token
		});

		return $res(tasks);
	} catch {
		// Hand back the created task so the client can still activate it. The API echoes `teams` as the
		// `{ id }` refs sent above, which the team schema rejects, so they are left out.
		const created = taskSchema.omit({ teams: true }).safeParse(createdTask);
		return $res(created.success ? { items: [created.data], total: 1 } : { items: [], total: 0 });
	}
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
