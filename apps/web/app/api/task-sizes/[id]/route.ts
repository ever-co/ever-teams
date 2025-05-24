import { INextParams } from '@/core/types/interfaces/to-review/IDataResponse';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskSizesRequest, editTaskSizesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/ITaskSize';

export async function PUT(req: Request, props: INextParams) {
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
