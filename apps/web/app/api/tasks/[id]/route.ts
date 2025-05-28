import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamTasksRequest, updateTaskRequest, getTaskByIdRequest } from '@/core/services/server/requests';
import { INextParams } from '@/core/types/interfaces/global/data-response';
import { ITask } from '@/core/types/interfaces/task/task';
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
		tenantId: tenantId || '',
		organizationId: organizationId || '',
		bearer_token: access_token || ''
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

	const body = (await req.json()) as ITask;

	// delete body.selectedTeam;
	delete body.rootEpic;

	await updateTaskRequest(
		{
			data: body,
			id: params.id
		},
		access_token || ''
	);

	const { data: tasks } = await getTeamTasksRequest({
		tenantId: tenantId || '',
		organizationId: organizationId || '',
		projectId: projectId || '',
		teamId: teamId || '',
		bearer_token: access_token || ''
	});

	return $res(tasks);
}
