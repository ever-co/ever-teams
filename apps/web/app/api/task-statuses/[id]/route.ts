import { INextParams } from '@/core/types/interfaces/common/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskStatusRequest, editTaskStatusRequest } from '@/core/services/server/requests/taskStatus';
import { NextResponse } from 'next/server';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const datas = (await req.json()) as ITaskStatusCreate;

	try {
		const response = await editTaskStatusRequest({
			id: params.id,
			bearer_token: access_token || '',
			datas,
			tenantId: tenantId || ''
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The status could not be updated');
	}
}

export async function DELETE(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	try {
		const response = await deleteTaskStatusRequest({
			id: params.id,
			bearer_token: access_token,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		return await gauzyErrorResponse(error, 'The status could not be deleted');
	}
}
