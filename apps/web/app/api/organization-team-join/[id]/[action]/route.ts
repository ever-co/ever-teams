import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { acceptRejectRequestToJoinRequest } from '@/core/services/server/requests';
import { ERequestStatus } from '@/core/types/interfaces/enums';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
	const { id, action } = await params;
	const res = new NextResponse();

	if (!id || !action) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const response = await acceptRejectRequestToJoinRequest({
		id: id,
		bearer_token: access_token,
		tenantId,
		action: action as ERequestStatus
	});

	return $res(response.data);
}
