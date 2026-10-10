import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerWorkedStatusRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	// The employee comes from the session, never from the query string. Without one there is no last log.
	const employeeId = user.employee?.id;
	if (!employeeId) return $res([]);

	const { data } = await getTimerWorkedStatusRequest({ tenantId, organizationId, employeeId }, access_token);

	return $res(data);
}
