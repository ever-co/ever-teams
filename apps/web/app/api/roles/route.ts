import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { createRoleRequest, getRolesRequest } from '@/core/services/server/requests';
import { IRole } from '@/core/types/interfaces/role/role';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const response = await getRolesRequest({
		bearer_token: access_token || '',
		tenantId: tenantId || ''
	});

	return $res(response.data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	const body = (await req.json()) as IRole;

	if (!user) return $res('unauthorized');

	const response = await createRoleRequest({
		bearer_token: access_token || '',
		tenantId: tenantId || '',
		data: {
			...body,
			tenantId
		}
	});

	return $res(response.data);
}
