import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, syncTimeSlotRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as { source: any };
	const { source } = body;
	await syncTimeSlotRequest(
		{
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source,
			employeeId: user.employee.id,
			duration: 5
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res(timerStatus);
}
