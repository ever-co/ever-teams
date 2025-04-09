import { INextParams, ITaskStatusCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteTaskStatusRequest, editTaskStatusRequest } from '@app/services/server/requests/taskStatus';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();

    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) return $res('Unauthorized');

    const datas = (await req.json()) as ITaskStatusCreate;

    const response = await editTaskStatusRequest({
		id: params.id,
		bearer_token: access_token,
		datas,
		tenantId
	});

    return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
    const params = await props.params;
    const res = new NextResponse();

    if (!params.id) {
		return;
	}

    const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

    if (!user) {
		return $res('Unauthorized');
	}

    const response = await deleteTaskStatusRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

    return $res(response.data);
}
