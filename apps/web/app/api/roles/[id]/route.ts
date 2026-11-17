import { INextParams } from '@/core/types/interfaces/common/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteRoleRequest, updateRoleRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { IRole } from '@/core/types/interfaces/role/role';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

export async function PUT(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');
	const body = (await req.json()) as IRole;

	const response = await updateRoleRequest({
		bearer_token: access_token || '',
		tenantId: tenantId || '',
		data: body
	});

	return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const response = await deleteRoleRequest({
		id: params.id,
		bearer_token: access_token || '',
		tenantId: tenantId || ''
	});

	return $res(response.data);
}
