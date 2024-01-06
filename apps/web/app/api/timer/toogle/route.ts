import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, stopTimerRequest, toggleTimerRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('');

	const body = req.body as unknown as { source: any };
	const { source } = body;

	await toggleTimerRequest(
		{
			source,
			logType: 'TRACKED',
			tenantId,
			taskId,
			organizationId,
			tags: []
		},
		access_token
	);

	await stopTimerRequest(
		{
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source,
			tags: []
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res(timerStatus);
}
