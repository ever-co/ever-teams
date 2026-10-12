import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamAssignableRolesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const response = await getTeamAssignableRolesRequest({
		bearer_token: access_token || '',
		tenantId: tenantId || ''
	});

	return $res(response.data);
}
