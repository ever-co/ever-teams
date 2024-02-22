import { INextParams, IRequestToJoinActionEnum } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { acceptRejectRequestToJoinRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id || !params.action) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const response = await acceptRejectRequestToJoinRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId,
		action: params.action as IRequestToJoinActionEnum
	});

	return $res(response.data);
}

export async function generateStaticParams() {
	return [{ id: '', action: '' }];
}
