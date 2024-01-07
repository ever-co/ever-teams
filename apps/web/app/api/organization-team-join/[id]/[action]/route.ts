import { IRequestToJoinActionEnum } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { acceptRejectRequestToJoinRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params : { id: string; action: string}}) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const { searchParams } = new URL(req.url);

	const { id, action } = params;

	if (id) {
		return $res(
			await acceptRejectRequestToJoinRequest({
				id: id as string,
				bearer_token: access_token,
				tenantId,
				action: action as IRequestToJoinActionEnum
			})
		);
	}
}
