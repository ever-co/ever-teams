import { INextParams } from '@/core/types/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getRolePermissionsRequest, updateRolePermissionRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const response = await getRolePermissionsRequest({
		roleId: params.id,
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

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const body = await req.json();

	const response = await updateRolePermissionRequest({
		bearer_token: access_token,
		tenantId,
		data: body
	});

	return $res(response.data);
}
