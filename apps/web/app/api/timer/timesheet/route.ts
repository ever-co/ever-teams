import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { readArrayParam, taskActivityRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	// The web client sends the task as taskIds[0]; a single taskId is read as well
	const taskIds = readArrayParam(searchParams, 'taskIds');
	const taskId = searchParams.get('taskId');
	if (taskId) {
		taskIds.push(taskId);
	}

	const { data } = await taskActivityRequest(
		{
			taskIds,
			tenantId,
			organizationId,
			defaultRange: 'false'
		},
		access_token
	);

	return $res(data);
}
