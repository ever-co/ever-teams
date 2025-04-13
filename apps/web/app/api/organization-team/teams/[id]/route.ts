import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { removeUserFromAllTeam } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: 401 });
	}

	const response = await removeUserFromAllTeam({
		userId: id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
