import { INextParams, IRole } from '@/core/types/interfaces';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteRoleRequest, updateRoleRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');
	const body = (await req.json()) as IRole;

	const response = await updateRoleRequest({
		bearer_token: access_token,
		tenantId,
		data: body
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

	if (!user) return $res('unauthorized');

	const response = await deleteRoleRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
