import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { removeUserFromAllTeam } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: status ?? 401 });
	}

	const response = await removeUserFromAllTeam({
		userId: id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
