import { IRole } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteRoleRequest, updateRoleRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');
	const body = (await req.json()) as IRole;

	return $res(
		await updateRoleRequest({
			bearer_token: access_token,
			tenantId,
			data: body
		})
	);
}

export async function DELETE(req: Request) {
	const res = new NextResponse();

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');
	const { searchParams } = new URL(req.url);

	const { id } = searchParams as unknown as { id: string };

	return $res(
		await deleteRoleRequest({
			id: id as string,
			bearer_token: access_token,
			tenantId
		})
	);
}
