import { INextParams } from '@/core/types/interfaces';
import { ITeamTask } from '@/core/types/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTeamTasksRequest, updateTaskRequest, getTaskByIdRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
	}

	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const response = await getTaskByIdRequest({
		taskId: params.id,
		tenantId,
		organizationId,
		bearer_token: access_token
	});

	return $res(response.data);
}

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
	}

	const { $res, user, tenantId, access_token, organizationId, projectId, teamId } = await authenticatedGuard(
		req,
		res
	);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as ITeamTask;

	delete body.selectedTeam;
	delete body.rootEpic;

	await updateTaskRequest(
		{
			data: body,
			id: params.id
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

	return $res(tasks);
}
