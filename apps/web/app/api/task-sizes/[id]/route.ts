import { INextParams } from '@/core/types/interfaces/common/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskSizesRequest, editTaskSizesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

export async function PUT(req: Request, props: INextParams) {
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

	const datas = (await req.json()) as unknown as ITaskSizesCreate;

	const response = await editTaskSizesRequest({
		id: params.id,
		bearer_token: access_token || '',
		datas,
		tenantId: tenantId || ''
	});

	return $res(response.data);
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

	if (!user) return $res('Unauthorized');

	const response = await deleteTaskSizesRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
