import { IRole } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { createRoleRequest, getRolesRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	return $res(
		(
			await getRolesRequest({
				bearer_token: access_token,
				tenantId
			})
		).data
	);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	const body = (await req.json()) as IRole;
	if (!user) return $res('unauthorized');

	return $res(
		(
			await createRoleRequest({
				bearer_token: access_token,
				tenantId,
				data: {
					...body,
					tenantId
				}
			})
		).data
	);
}
