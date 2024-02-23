import { INextParams, ITaskSizesCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteTaskSizesRequest, editTaskSizesRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const datas = (await req.json()) as unknown as ITaskSizesCreate;

	const response = await editTaskSizesRequest({
		id: params.id,
		bearer_token: access_token,
		datas,
		tenantId
	});

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
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

export async function generateStaticParams() {
	return [{ id: '' }];
}
