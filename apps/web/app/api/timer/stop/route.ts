/* eslint-disable no-mixed-spaces-and-tabs */
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, stopTimerRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as { source: any };
	const { source } = body;
	await stopTimerRequest(
		{
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source: source,
			tags: [],
			// Task id is optional in case timer is already started in another source
			...(taskId
				? {
						taskId
				  }
				: {})
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res(timerStatus);
}
