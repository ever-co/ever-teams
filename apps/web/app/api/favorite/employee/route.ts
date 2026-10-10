import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getFavoritesByEmployeeRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data } = await getFavoritesByEmployeeRequest({
		query: new URL(req.url).searchParams.toString(),
		bearer_token: access_token,
		tenantId
	});

	return $res(data);
}
