import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, readTodayRange } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { data } = await getTimerStatusRequest({ tenantId, organizationId, ...readTodayRange(req) }, access_token);

	return $res(data);
}
