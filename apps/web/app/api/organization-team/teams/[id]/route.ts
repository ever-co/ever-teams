import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import { removeUserFromAllTeam } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { id } = params;
	if (!id) return NextResponse.json({}, { status: 400 });
	return $res(
		await removeUserFromAllTeam({
			userId: id as string,
			bearer_token: access_token,
			tenantId
		})
	);
}
