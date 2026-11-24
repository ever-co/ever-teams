import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { readArrayParam, taskActivityRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

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

	try {
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
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The activity of the task could not be read.');
	}
}
