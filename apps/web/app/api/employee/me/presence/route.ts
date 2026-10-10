import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateEmployeePresenceRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { isIdle } = (await req.json()) as { isIdle: boolean };

	const response = await updateEmployeePresenceRequest({
		bearer_token: access_token,
		tenantId,
		isIdle
	});

	return $res(response.data);
}
