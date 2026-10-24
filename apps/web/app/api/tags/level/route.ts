import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTaskLabelsListRequest } from '@/core/services/server/requests/task-labels';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const organizationTeamId = searchParams.get('organizationTeamId') || null;

	const par = {
		tenantId,
		organizationId,
		organizationTeamId
	};

	const { data } = await getTaskLabelsListRequest(par, access_token);

	return $res(data);
}
