import { INextParams, ITagCreate } from '@/core/types/interfaces/to-review';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteTaskLabelsRequest, editTaskLabelsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const response = await deleteTaskLabelsRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const body = (await req.json()) as unknown as ITagCreate;

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const response = await editTaskLabelsRequest({
		id: params.id,
		datas: body,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
