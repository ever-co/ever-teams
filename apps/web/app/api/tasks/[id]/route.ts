import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateTaskRequest, getTaskByIdRequest } from '@/core/services/server/requests';
import { unwrapRejection } from '@/core/services/server/fetch';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { ITask } from '@/core/types/interfaces/task/task';
import { NextResponse } from 'next/server';

/** Gauzy's HTTP status in an unwrapped serverFetch rejection, or undefined when the API gave no error answer. */
function getApiErrorStatus(error: unknown): number | undefined {
	const statusCode = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
	const isErrorStatus = typeof statusCode === 'number' && statusCode >= 400;
	if (!isErrorStatus) {
		return undefined;
	}
	return statusCode;
}

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
	}

	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	try {
		const response = await getTaskByIdRequest({
			taskId: params.id,
			tenantId: tenantId || '',
			organizationId: organizationId || '',
			bearer_token: access_token || ''
		});

		return $res(response.data);
	} catch (error) {
		// Gauzy's own refusal goes back with its status (404 for a missing task) instead of a 500, so the task
		// page can tell a missing task from a failed load. Anything else is rethrown as before.
		const apiError = await unwrapRejection(error);
		const status = getApiErrorStatus(apiError);
		if (status === undefined) {
			throw error;
		}
		return NextResponse.json(apiError, { status });
	}
}

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
	}

	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as ITask;

	// delete body.selectedTeam;
	delete body.rootEpic;

	const { data: task } = await updateTaskRequest(
		{
			data: body,
			id: params.id
		},
		access_token || ''
	);

	return $res(task);
}
