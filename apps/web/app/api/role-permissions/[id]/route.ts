import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getRolePermissionsRequest, updateRolePermissionRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const { searchParams } = new URL(req.url);
	const { id } = searchParams as unknown as { id: string };

	return $res(
		(
			await getRolePermissionsRequest({
				bearer_token: access_token,
				tenantId,
				roleId: id as string
			})
		).data
	);
}

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const body = await req.json();

	return $res(
		(
			await updateRolePermissionRequest({
				bearer_token: access_token,
				tenantId,
				data: body
			})
		).data
	);
}
