import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { resetUserRequest } from '@/core/services/server/requests/user';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function DELETE(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
		const response = await resetUserRequest({
			bearer_token: access_token,
			tenantId
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The data of the account could not be deleted.');
	}
}
