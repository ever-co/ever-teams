import { IRole } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteRoleRequest, updateRoleRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const { id } = params;

	const response = await deleteRoleRequest({
		id: id as string,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
