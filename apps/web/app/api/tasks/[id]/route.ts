import { ITeamTask } from '@app/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTeamTasksRequest, updateTaskRequest, getTaskByIdRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { id: taskId } = searchParams as unknown as { id: string };

	return $res(
		await getTaskByIdRequest({
			taskId: taskId as string,
			tenantId,
			organizationId,
			bearer_token: access_token
		})
	);
}

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId, projectId, teamId } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { id: taskId } = searchParams as unknown as { id: string };
	const body = req.body as unknown as ITeamTask;

	delete body.selectedTeam;
	delete body.rootEpic;

	await updateTaskRequest(
		{
			data: body,
			id: taskId as string
		},
		access_token
	);

	const { data: tasks } = await getTeamTasksRequest({
		tenantId,
		organizationId,
		projectId,
		teamId,
		bearer_token: access_token
	});

	$res(tasks);
}
// Unauthorized;
