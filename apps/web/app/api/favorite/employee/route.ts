import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getFavoritesByEmployeeRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const { data } = await getFavoritesByEmployeeRequest({
		query: new URL(req.url).searchParams.toString(),
		bearer_token: access_token,
		tenantId
	});

	return $res(data);
}
