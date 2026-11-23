import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { acceptRejectRequestToJoinRequest } from '@/core/services/server/requests';
import { ERequestStatus } from '@/core/types/generics/enums';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { id, action } = await params;
	const res = new NextResponse();

	if (!id || !action) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	try {
		const response = await acceptRejectRequestToJoinRequest({
			id: id,
			bearer_token: access_token,
			tenantId,
			action: action as ERequestStatus
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The request to join could not be updated.');
	}
}
