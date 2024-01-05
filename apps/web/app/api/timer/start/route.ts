import { TimerSource } from '@app/interfaces/ITimer';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, startTimerRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export default async function POST(req: Request) {
	const res = new NextResponse();
	const {
		$res,
		user,
		tenantId,
		access_token,
		organizationId,
		taskId,
		teamId: organizationTeamId
	} = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	await startTimerRequest(
		{
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source: TimerSource.TEAMS,
			tags: [],
			organizationTeamId
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res(timerStatus);
}
