import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { removeUserFromAllTeam } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: 401 });
	}

	const response = await removeUserFromAllTeam({
		userId: params.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
