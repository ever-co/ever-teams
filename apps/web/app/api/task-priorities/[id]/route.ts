import { INextParams } from '@/core/types/interfaces/global/IDataResponse';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskPrioritiesRequest, editTaskPrioritiesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/ITaskPriority';

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const datas = (await req.json()) as unknown as ITaskPrioritiesCreate;

	const response = await editTaskPrioritiesRequest({
		id: params.id,
		bearer_token: access_token || '',
		datas,
		tenantId
	});

	return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const response = await deleteTaskPrioritiesRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
