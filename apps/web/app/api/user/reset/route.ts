import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { resetUserRequest } from '@/core/services/server/requests/user';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const response = await resetUserRequest({
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
