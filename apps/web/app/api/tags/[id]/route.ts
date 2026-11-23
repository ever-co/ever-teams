import { INextParams } from '@/core/types/interfaces/common/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskLabelsRequest, editTaskLabelsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function DELETE(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'unauthorized' }, { status: status ?? 401 });
	}

	try {
		const response = await deleteTaskLabelsRequest({
			id: params.id,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The label could not be deleted.');
	}
}

export async function PUT(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const body = (await req.json()) as unknown as ITagCreate;

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'unauthorized' }, { status: status ?? 401 });
	}

	try {
		const response = await editTaskLabelsRequest({
			id: params.id,
			datas: body,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The label could not be updated.');
	}
}
