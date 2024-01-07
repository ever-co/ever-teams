import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { resetUserRequest } from '@app/services/server/requests/user';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	return $res(
		await resetUserRequest({
			bearer_token: access_token,
			tenantId
		})
	);
}
